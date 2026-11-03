"""Exporta manos jugadas por el motor de ordago como casos de equivalencia para Tantos.

Uso (desde la raíz de este repo):
    uv run --project "<ruta-de-ordago>" python tools/exportar_casos.py \
        --ordago "<ruta-de-ordago>" --salida tests/casos/ordago.json

Ordago es la autoridad de las reglas: aquí solo se lee. Se juegan manos con agentes
de cobertura (aleatorios con sesgo) que recorren todas las resoluciones, y se guardan
las cartas, el historial de cada lance y los cobros que el motor registró.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter
from collections.abc import Sequence
from random import Random

from ordago.engine.actions import Accion, TipoAccion, no_quiero, ordago, paso, quiero
from ordago.engine.betting import Resolucion, acciones_legales, rango_envido
from ordago.engine.cards import VarianteBaraja
from ordago.engine.config import ConfigPartida, ReglasTanteo
from ordago.engine.game import Partida
from ordago.engine.observation import ObservacionEnvite, ObservacionMus

CONFIG_JSON = {
    "variant": "cuatro_reyes",
    "piedra_paso": 1,
    "min_envido": 2,
    "real_valida": False,
    "paso_paga_en_jugada": False,
}


class AgenteCobertura:
    """Juego legal aleatorio sesgado para cubrir todas las resoluciones."""

    name = "cobertura"

    def __init__(self, semilla: int) -> None:
        self._rng = Random(semilla)

    def quiere_mus(self, observacion: ObservacionMus) -> bool:
        return self._rng.random() < 0.5

    def elegir_descartes(self, observacion: ObservacionMus) -> Sequence[int]:
        n = self._rng.randint(1, len(observacion.jugada))
        return self._rng.sample(range(len(observacion.jugada)), n)

    def _envido(self, observacion: ObservacionEnvite) -> Accion:
        minimo, maximo = rango_envido(observacion)
        return Accion(TipoAccion.ENVIDO, self._rng.randint(minimo, min(maximo, minimo + 8)))

    def _elegir(self, opciones: list[tuple[float, str]]) -> str:
        total = sum(p for p, _ in opciones)
        x = self._rng.random() * total
        for p, nombre in opciones:
            x -= p
            if x < 0:
                return nombre
        return opciones[-1][1]

    def actuar(self, observacion: ObservacionEnvite) -> Accion:
        legales = acciones_legales(observacion)
        hay_envido = any(a.tipo is TipoAccion.ENVIDO for a in legales)
        hay_ordago = any(a.tipo is TipoAccion.ORDAGO for a in legales)
        if not observacion.frente_a_envite:
            opciones = [(0.55, "paso"), (0.15, "ordago")]
            if hay_envido:
                opciones.append((0.30, "envido"))
        else:
            opciones = [(0.35, "quiero"), (0.40, "no_quiero")]
            if hay_envido:
                opciones.append((0.20, "envido"))
            if hay_ordago:
                opciones.append((0.05, "ordago"))
        match self._elegir(opciones):
            case "paso":
                return paso()
            case "quiero":
                return quiero()
            case "no_quiero":
                return no_quiero()
            case "ordago":
                return ordago()
            case _:
                return self._envido(observacion)


def _accion_json(puesto: int, accion: Accion) -> list[object]:
    return [puesto, accion.tipo.value, accion.cantidad]


def generar(casos: int, semilla: int) -> list[dict[str, object]]:
    config = ConfigPartida(
        variant=VarianteBaraja.CUATRO_REYES,
        tanteo=ReglasTanteo(
            piedra_paso=CONFIG_JSON["piedra_paso"],  # type: ignore[arg-type]
            min_envido=CONFIG_JSON["min_envido"],  # type: ignore[arg-type]
            ordago_acaba_partida=True,
            real_valida=False,
            paso_paga_en_jugada=False,
        ),
    )
    agentes = [AgenteCobertura(semilla * 4 + i) for i in range(4)]
    partida = Partida(agentes, config=config, rng=Random(semilla))
    salida: list[dict[str, object]] = []
    while len(salida) < casos:
        partida.tanteos[:] = [0, 0]
        reg = partida.jugar_mano()
        if reg.ganador_partida is not None:
            continue
        if any(r.resolucion is Resolucion.ORDAGO for r in reg.resultados):
            continue
        salida.append(
            {
                "mano": reg.mano,
                "jugadas": [[[int(c.rango), int(c.palo)] for c in j] for j in reg.jugadas],
                "lances": [
                    {
                        "lance": r.lance.value,
                        "resolucion": r.resolucion.value,
                        "participantes": list(r.participantes),
                        "historial": [_accion_json(p, a) for p, a in r.historial],
                    }
                    for r in reg.resultados
                ],
                "cobros": [
                    {
                        "lance": e.lance.value,
                        "pareja": int(e.pareja),
                        "piedras": e.piedras,
                        "motivo": e.motivo,
                    }
                    for e in reg.eventos
                ],
            }
        )
    return salida


def resumen(casos: list[dict[str, object]]) -> str:
    por_lance: Counter[tuple[str, str]] = Counter()
    subidas = ordagos = 0
    for caso in casos:
        for lance in caso["lances"]:  # type: ignore[attr-defined]
            por_lance[(lance["lance"], lance["resolucion"])] += 1
            if lance["resolucion"] != "no_querido":
                continue
            tipos = [h[1] for h in lance["historial"]]
            if tipos.count("envido") >= 2:
                subidas += 1
            if "ordago" in tipos:
                ordagos += 1
    lineas = [f"casos: {len(casos)}"]
    lineas += [f"  {lance:6s} {res:18s} {n}" for (lance, res), n in sorted(por_lance.items())]
    lineas.append(f"subidas no queridas: {subidas}")
    lineas.append(f"órdagos no queridos: {ordagos}")
    return "\n".join(lineas)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--casos", type=int, default=4000)
    ap.add_argument("--semilla", type=int, default=20261103)
    ap.add_argument("--ordago", required=True, help="ruta del repo de ordago (para su commit)")
    ap.add_argument("--salida", required=True)
    args = ap.parse_args()

    commit = subprocess.run(
        ["git", "-C", args.ordago, "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    ).stdout.strip()
    casos = generar(args.casos, args.semilla)
    with open(args.salida, "w", encoding="utf-8") as f:
        json.dump({"ordago_commit": commit, "config": CONFIG_JSON, "casos": casos}, f)
        f.write("\n")
    print(resumen(casos), file=sys.stderr)


if __name__ == "__main__":
    main()
