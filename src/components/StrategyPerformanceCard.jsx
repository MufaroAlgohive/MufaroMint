// Example: Displaying Strategy Performance

import { useStrategyPerformance } from "../hooks/useStrategyPerformance";

export const StrategyPerformanceCard = ({ strategyId }) => {
  const { performance, loading, error } = useStrategyPerformance(strategyId);

  if (loading) return <div>Loading performance data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!performance || performance.length === 0) return <div>No data</div>;

  const perf = performance[0]; // Get latest
  const returns = perf.returns;

  return (
    <div className="performance-card">
      <h3>Performance Metrics</h3>
      <p>As of: {perf.as_of_date}</p>
      <p>Portfolio Value: R{(perf.portfolio_value / 100).toFixed(2)}</p>

      <div className="returns-grid">
        <div className="return-item">
          <span>YTD</span>
          <span className={returns.ytd >= 0 ? "positive" : "negative"}>
            {returns.ytd}%
          </span>
        </div>

        <div className="return-item">
          <span>1 Month</span>
          <span className={returns.one_month >= 0 ? "positive" : "negative"}>
            {returns.one_month}%
          </span>
        </div>

        <div className="return-item">
          <span>1 Year</span>
          <span className={returns.one_year >= 0 ? "positive" : "negative"}>
            {returns.one_year}%
          </span>
        </div>

        <div className="return-item">
          <span>3 Year</span>
          <span className={returns.three_year >= 0 ? "positive" : "negative"}>
            {returns.three_year}%
          </span>
        </div>

        <div className="return-item">
          <span>All Time</span>
          <span className={returns.all_time >= 0 ? "positive" : "negative"}>
            {returns.all_time}%
          </span>
        </div>
      </div>
    </div>
  );
};


// Usage in a page:
// <StrategyPerformanceCard strategyId="640dcffb-dc23-4099-9772-0f72ed9688de" />
