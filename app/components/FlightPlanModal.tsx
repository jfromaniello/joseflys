"use client";

import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { Dialog, Transition, TransitionChild } from "@headlessui/react";
import {
  loadFlightPlans,
  createFlightPlan,
  type FlightPlan,
} from "@/lib/flightPlan";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";

interface FlightPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flightPlan: FlightPlan, isNew: boolean) => void;
  currentFlightPlanId?: string; // If leg is already in a flight plan
}

export function FlightPlanModal({
  isOpen,
  onClose,
  onSelect,
  currentFlightPlanId,
}: FlightPlanModalProps) {
  // Load plans whenever modal is open (cached by useMemo)
  const flightPlans = useMemo(() => {
    return isOpen ? loadFlightPlans() : [];
  }, [isOpen]);

  // Initialize selectedPlanId based on currentFlightPlanId
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => currentFlightPlanId || "");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New flight plan form
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDate, setNewPlanDate] = useState("");

  // Track previous values to detect modal open transition
  const prevIsOpenRef = useRef(false);

  // Reset form when modal opens
  useEffect(() => {
    // This effect intentionally resets form state when modal opens.
    // It's safe because:
    // 1. It only runs on the open transition (isOpen changes from false to true)
    // 2. The states being set are form fields, not the dependencies
    // 3. This is a common pattern for modal reset behavior
    if (isOpen && !prevIsOpenRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPlanId(currentFlightPlanId || "");
      setIsCreatingNew(false);
      setNewPlanName("");
      setNewPlanDate("");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentFlightPlanId]);

  const handleSubmit = () => {
    if (isCreatingNew) {
      // Create new flight plan
      if (!newPlanName.trim()) {
        alert("Please enter a flight plan name");
        return;
      }

      const newPlan = createFlightPlan(
        newPlanName.trim(),
        newPlanDate || undefined
      );

      onSelect(newPlan, true);
      onClose();
    } else {
      // Select existing flight plan
      if (!selectedPlanId) {
        alert("Please select a flight plan");
        return;
      }

      const plan = flightPlans.find((p) => p.id === selectedPlanId);
      if (!plan) {
        alert("Flight plan not found");
        return;
      }

      onSelect(plan, false);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleNewPlanClick = () => {
    setIsCreatingNew(true);
    setSelectedPlanId("");
  };

  const handleExistingPlanClick = () => {
    setIsCreatingNew(false);
    setNewPlanName("");
    setNewPlanDate("");
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </TransitionChild>

        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 border border-gray-700 p-6 text-left align-middle shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold text-white mb-1"
                    >
                      {currentFlightPlanId
                        ? "Update Flight Plan"
                        : "Save to Flight Plan"}
                    </Dialog.Title>
                    <p
                      className="text-sm"
                      style={{ color: "oklch(0.6 0.02 240)" }}
                    >
                      {currentFlightPlanId
                        ? "Update this leg in the current flight plan or move to a different one"
                        : "Add this leg to a new or existing flight plan"}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Toggle buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleNewPlanClick}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isCreatingNew
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    New Plan
                  </button>
                  <button
                    onClick={handleExistingPlanClick}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      !isCreatingNew
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                    }`}
                  >
                    Existing Plan
                  </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                  {isCreatingNew ? (
                    // New Flight Plan Form
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="planName"
                          className="block text-sm font-medium text-white mb-2"
                        >
                          Flight Plan Name *
                        </label>
                        <input
                          id="planName"
                          type="text"
                          value={newPlanName}
                          onChange={(e) => setNewPlanName(e.target.value)}
                          placeholder="e.g., SAZS to SACO"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="planDate"
                          className="block text-sm font-medium text-white mb-2"
                        >
                          Flight Date (Optional)
                        </label>
                        <input
                          id="planDate"
                          type="date"
                          value={newPlanDate}
                          onChange={(e) => setNewPlanDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    // Select Existing Flight Plan
                    <div>
                      {flightPlans.length === 0 ? (
                        <div className="text-center py-8">
                          <p
                            className="text-sm mb-3"
                            style={{ color: "oklch(0.6 0.02 240)" }}
                          >
                            No flight plans yet. Create your first one!
                          </p>
                          <button
                            onClick={handleNewPlanClick}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            <PlusIcon className="h-4 w-4 inline mr-1" />
                            Create New Plan
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-white mb-2">
                            Select Flight Plan
                          </label>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {flightPlans.map((plan) => (
                              <button
                                key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                                  selectedPlanId === plan.id
                                    ? "bg-blue-600/20 border-blue-500 text-white"
                                    : "bg-slate-900 border-gray-600 text-gray-300 hover:bg-slate-700"
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-white">
                                      {plan.name}
                                    </div>
                                    <div
                                      className="text-xs mt-1"
                                      style={{ color: "oklch(0.6 0.02 240)" }}
                                    >
                                      {plan.legs.length} leg
                                      {plan.legs.length !== 1 ? "s" : ""}
                                      {plan.date && ` • ${plan.date}`}
                                    </div>
                                  </div>
                                  {selectedPlanId === plan.id && (
                                    <div className="ml-2 shrink-0">
                                      <svg
                                        className="h-5 w-5 text-blue-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={
                      isCreatingNew
                        ? !newPlanName.trim()
                        : !selectedPlanId && flightPlans.length > 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {currentFlightPlanId ? "Update" : "Save"}
                  </button>
                </div>
              </Dialog.Panel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
