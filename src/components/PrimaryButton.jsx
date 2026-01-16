const PrimaryButton = ({
  ariaLabel,
  onClick,
  children,
  className = 'glass-btn mr-2',
  type = 'button'
}) => (
  <button type={type} onClick={onClick} className={className} aria-label={ariaLabel}>
    {children}
  </button>
);

export default PrimaryButton;
