"use client";

import { PhoneIcon, DocumentTextIcon, ClockIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { AnacAerodromeDetail } from "@/lib/clients/anac";
import { CardAnchor } from "./CardAnchor";

interface AnacInfoCardProps {
  detail: AnacAerodromeDetail;
}

export function AnacInfoCard({ detail }: AnacInfoCardProps) {
  const hasData =
    detail.runways.length > 0 ||
    detail.telephone.length > 0 ||
    detail.fuel ||
    detail.atz ||
    detail.service_schedule ||
    detail.norms_general ||
    detail.norms_particular;

  if (!hasData) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPinIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <h2 className="text-lg font-semibold text-white">ANAC Data</h2>
        <CardAnchor id="anac" />
        <span className="text-xs text-slate-500 ml-auto">Source: MADHEL</span>
      </div>

      {/* Location Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-4">
        {detail.city && (
          <div>
            <span className="text-slate-400">City:</span>
            <span className="text-white ml-2">{detail.city}</span>
          </div>
        )}
        {detail.province && (
          <div>
            <span className="text-slate-400">Province:</span>
            <span className="text-white ml-2">{detail.province}</span>
          </div>
        )}
        {detail.region && (
          <div>
            <span className="text-slate-400">Region:</span>
            <span className="text-white ml-2">{detail.region}</span>
          </div>
        )}
        {detail.fir && (
          <div>
            <span className="text-slate-400">FIR:</span>
            <span className="text-white ml-2">{detail.fir}</span>
          </div>
        )}
        {detail.control && (
          <div>
            <span className="text-slate-400">Control:</span>
            <span className="text-white ml-2">{detail.control}</span>
          </div>
        )}
        {detail.condition && (
          <div>
            <span className="text-slate-400">Condition:</span>
            <span className="text-white ml-2">{detail.condition}</span>
          </div>
        )}
        {detail.traffic && (
          <div>
            <span className="text-slate-400">Traffic:</span>
            <span className="text-white ml-2">{detail.traffic}</span>
          </div>
        )}
        {detail.elevation && (
          <div>
            <span className="text-slate-400">Elevation (ANAC):</span>
            <span className="text-white ml-2">{detail.elevation} m</span>
          </div>
        )}
      </div>

      {/* Runways */}
      {detail.runways.length > 0 && (
        <div className="border-t border-slate-700 pt-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
            Runways (ANAC)
          </h3>
          <div className="space-y-2">
            {detail.runways.map((rwy, idx) => (
              <div
                key={idx}
                className="bg-slate-900/30 rounded-lg p-3 text-sm text-white"
              >
                {rwy}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ATZ */}
      {detail.atz && (
        <div className="border-t border-slate-700 pt-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">
            ATZ
          </h3>
          <p className="text-sm text-white">{detail.atz}</p>
        </div>
      )}

      {/* Fuel */}
      {detail.fuel && (
        <div className="border-t border-slate-700 pt-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Fuel
            </h3>
          </div>
          <p className="text-sm text-white">{detail.fuel}</p>
        </div>
      )}

      {/* Service Schedule */}
      {detail.service_schedule && (
        <div className="border-t border-slate-700 pt-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Service Schedule
            </h3>
          </div>
          <p className="text-sm text-white">{detail.service_schedule}</p>
        </div>
      )}

      {/* Telephone */}
      {detail.telephone.length > 0 && (
        <div className="border-t border-slate-700 pt-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <PhoneIcon className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Contact
            </h3>
          </div>
          <div className="space-y-1">
            {detail.telephone.map((tel, idx) => (
              <p key={idx} className="text-sm text-white">
                {tel}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Norms */}
      {(detail.norms_general || detail.norms_particular) && (
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <DocumentTextIcon className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Regulations
            </h3>
          </div>
          {detail.norms_general && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-slate-400 mb-1">General</h4>
              <p className="text-sm text-white whitespace-pre-line">{detail.norms_general}</p>
            </div>
          )}
          {detail.norms_particular && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-1">Particular</h4>
              <p className="text-sm text-white whitespace-pre-line">{detail.norms_particular}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
