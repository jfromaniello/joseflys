"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">Sin conexión</h1>
          <p className="text-slate-400 text-lg">
            Parece que no tienes conexión a internet en este momento.
          </p>
        </div>

        <div className="bg-slate-900 rounded-lg p-6 space-y-4 text-left border border-slate-800">
          <h2 className="text-xl font-semibold text-white">
            Calculadoras disponibles offline:
          </h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>
                <strong className="text-white">TAS Calculator:</strong> Calcula
                la velocidad verdadera del aire
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Wind Calculator:</strong> Calcula
                correcciones de viento y rumbo
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Conversions:</strong> Convierte
                unidades de aviación
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-1">✓</span>
              <span>
                <strong className="text-white">Flight Planning:</strong> Planifica
                tus vuelos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-1">⚠</span>
              <span>
                <strong className="text-white">Distance Calculator:</strong> La
                búsqueda de ciudades requiere conexión
              </span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Reintentar conexión
          </button>
          <Link
            href="/"
            className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
