import React, { useState, useEffect } from "react";
import { X, Target, Plus, Check, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const GoalLinkModal = ({ isOpen, onClose, onConfirm, investmentAmount, assetName }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [skipGoal, setSkipGoal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGoals();
      setSelectedGoalId(null);
      setShowCreateForm(false);
      setSkipGoal(false);
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalDate("");
    }
  }, [isOpen]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let { data, error } = await supabase
        .from("investment_goals")
        .select("id, name, target_amount, current_amount, invested_amount, linked_asset_name, is_active")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error && error.message && error.message.includes('does not exist')) {
        const fallback = await supabase
          .from("investment_goals")
          .select("id, name, target_amount, current_amount, is_active")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (!error) {
        setGoals(data || []);
      } else {
        console.error("Error fetching goals:", error);
      }
    } catch (e) {
      console.error("Error fetching goals:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoalName || !newGoalTarget) return;

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("investment_goals")
        .insert({
          user_id: session.user.id,
          name: newGoalName,
          target_amount: parseFloat(newGoalTarget),
          target_date: newGoalDate || null,
          current_amount: 0,
          invested_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setGoals((prev) => [data, ...prev]);
      setSelectedGoalId(data.id);
      setShowCreateForm(false);
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalDate("");
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = () => {
    if (skipGoal) {
      onConfirm(null);
    } else {
      onConfirm(selectedGoalId);
    }
  };

  const formatCurrency = (amount) => {
    return `R${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (!isOpen) return null;

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const remainingAfterInvest = selectedGoal
    ? Math.max(0, (selectedGoal.target_amount || 0) - (selectedGoal.invested_amount || 0) - (investmentAmount || 0))
    : 0;
  const progressAfterInvest = selectedGoal && selectedGoal.target_amount > 0
    ? Math.min(100, (((selectedGoal.invested_amount || 0) + (investmentAmount || 0)) / selectedGoal.target_amount) * 100)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                <h2 className="text-base font-semibold text-slate-900">Link to a Goal</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <p className="text-xs text-slate-500 mb-4">
                Would you like to link this {formatCurrency(investmentAmount)} investment in <span className="font-semibold text-slate-700">{assetName}</span> to a goal?
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setSkipGoal(true); setSelectedGoalId(null); }}
                    className={`mb-3 flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${
                      skipGoal
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Skip for now</p>
                      <p className="text-xs text-slate-500">Invest without linking to a goal</p>
                    </div>
                    {skipGoal && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>

                  {goals.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Your Goals</p>
                      <div className="space-y-2">
                        {goals.map((goal) => {
                          const isSelected = selectedGoalId === goal.id;
                          const invested = goal.invested_amount || 0;
                          const progress = goal.target_amount > 0 ? Math.min(100, (invested / goal.target_amount) * 100) : 0;
                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={() => { setSelectedGoalId(goal.id); setSkipGoal(false); }}
                              className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${
                                isSelected
                                  ? "border-violet-600 bg-violet-50"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{goal.name}</p>
                                  <p className="text-xs font-semibold text-slate-600 ml-2 flex-shrink-0">
                                    {formatCurrency(invested)} / {formatCurrency(goal.target_amount)}
                                  </p>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                {goal.linked_asset_name && (
                                  <p className="text-[10px] text-slate-400 mt-1">Linked to {goal.linked_asset_name}</p>
                                )}
                              </div>
                              {isSelected && (
                                <div className="ml-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!showCreateForm ? (
                    <button
                      type="button"
                      onClick={() => { setShowCreateForm(true); setSkipGoal(false); }}
                      className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-3 text-left transition hover:border-violet-400 hover:bg-violet-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
                        <Plus className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Create new goal</p>
                        <p className="text-xs text-slate-500">Set a savings target for this investment</p>
                      </div>
                    </button>
                  ) : (
                    <form onSubmit={handleCreateGoal} className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
                      <p className="text-xs font-semibold text-violet-700">New Goal</p>
                      <input
                        type="text"
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                        placeholder="Goal name (e.g. New Car)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        value={newGoalTarget}
                        onChange={(e) => setNewGoalTarget(e.target.value)}
                        placeholder="Target amount (e.g. 10000)"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"
                        required
                      />
                      <input
                        type="date"
                        value={newGoalDate}
                        onChange={(e) => setNewGoalDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creating || !newGoalName || !newGoalTarget}
                          className="flex-1 rounded-xl bg-violet-600 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          {creating ? "Creating..." : "Create & Select"}
                        </button>
                      </div>
                    </form>
                  )}

                  {selectedGoalId && selectedGoal && (
                    <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">After this investment</p>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-900">{selectedGoal.name}</p>
                        <p className="text-xs font-semibold text-emerald-700">{progressAfterInvest.toFixed(0)}%</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-emerald-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                          style={{ width: `${progressAfterInvest}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-emerald-600">
                        {remainingAfterInvest > 0
                          ? `${formatCurrency(remainingAfterInvest)} remaining to reach your goal`
                          : "You'll reach your goal!"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!skipGoal && !selectedGoalId}
                className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200/60 disabled:opacity-50 disabled:cursor-not-allowed transition hover:enabled:-translate-y-0.5"
              >
                {skipGoal ? "Continue Without Goal" : selectedGoalId ? "Link & Continue" : "Select a Goal"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GoalLinkModal;
