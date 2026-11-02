import { BudgetsPanel } from "@/components/budgets-panel";
import { GoalsPanel } from "@/components/goals-panel";

/** Planning in one place: monthly budgets (limits) and goals (savings targets). */
export default function PlanPage() {
  return (
    <div className="grid gap-10">
      <section id="budgets" aria-label="Budgets" className="scroll-mt-28"><BudgetsPanel /></section>
      <section id="goals" aria-label="Goals" className="scroll-mt-28"><GoalsPanel /></section>
    </div>
  );
}
