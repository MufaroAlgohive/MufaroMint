import { forwardRef } from 'react';

const AnimatedLabelInput = forwardRef(
  (
    {
      id,
      label,
      placeholder,
      autoComplete,
      required = false,
      className = '',
      baseClassName,
      value,
      onChange,
      type = 'text',
      inputMode,
      maxLength,
      minLength,
      pattern,
      onKeyDown,
      disabled = false,
    },
    ref
  ) => {
    if (!label) {
      return (
        <input
          ref={ref}
          type={type}
          id={id}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`${baseClassName ?? 'flex-1 bg-transparent outline-none'} ${className}`.trim()}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
      );
    }

    return (
      <div className="animated-input-wrapper">
        <input
          ref={ref}
          type={type}
          id={id}
          placeholder=" "
          required={required}
          autoComplete={autoComplete}
          className={`animated-label-input ${className}`.trim()}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        <label htmlFor={id} className="animated-label" aria-hidden="true">
          {label.split('').map((char, i) => (
            <span key={i} style={{ transitionDelay: `${i * 40}ms` }}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </label>
      </div>
    );
  }
);

AnimatedLabelInput.displayName = 'AnimatedLabelInput';

export default AnimatedLabelInput;
