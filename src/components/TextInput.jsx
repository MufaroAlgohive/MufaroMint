import { forwardRef } from 'react';

const TextInput = forwardRef(
  (
    {
      id,
      placeholder,
      autoComplete,
      required = false,
      className = '',
      baseClassName = 'flex-1 bg-transparent outline-none',
      value,
      onChange,
      type = 'text',
      inputMode,
      maxLength,
      minLength,
      pattern,
      onKeyDown
    },
    ref
  ) => (
    <input
      ref={ref}
      type={type}
      id={id}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      className={`${baseClassName} ${className}`.trim()}
      value={value}
      onChange={onChange}
      inputMode={inputMode}
      maxLength={maxLength}
      minLength={minLength}
      pattern={pattern}
      onKeyDown={onKeyDown}
    />
  )
);

TextInput.displayName = 'TextInput';

export default TextInput;
