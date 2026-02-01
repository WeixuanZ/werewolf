import React, { useRef } from 'react';
import { theme, Typography } from 'antd';

const { Text } = Typography;

interface MobileDateInputProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
}

/**
 * A mobile-optimized date input component that uses the native date picker
 * but presents a custom styled UI.
 *
 * Addresses sizing and usability issues on mobile devices by providing
 * a large touch target and leveraging the native OS date picker.
 */
export const MobileDateInput: React.FC<MobileDateInputProps> = ({
  label,
  value,
  onChange,
  style,
  className,
  placeholder = 'Select Date',
}) => {
  const { token } = theme.useToken();
  const inputRef = useRef<HTMLInputElement>(null);

  // Format date for display (e.g. Feb 1, 2026)
  // Handles timezone issues by treating the YYYY-MM-DD string as local date components
  const getDisplayValue = (dateString: string) => {
    if (!dateString) return '';

    // Better approach:
    const [year, month, day] = dateString.split('-');
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    return localDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayValue = value ? getDisplayValue(value) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }} className={className}>
      {label && (
        <Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>
          {label}
        </Text>
      )}
      <div
        style={{
          position: 'relative',
          height: 50, // Comfortable touch target (min 44px)
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', // Center text as per screenshot (or maybe left?)
          // Screenshot IMG_7089 shows "Feb 1, 2026" centered in the button-like field
          padding: '0 16px',
          border: `1px solid ${token.colorBorderSecondary}`,
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
        // Click handling is covered by the input overlay, but this helps if overlay fails
        onClick={() => inputRef.current?.showPicker?.()}
      >
        {/* Visible Text */}
        <span
          style={{
            fontSize: 16,
            color: value ? token.colorText : token.colorTextPlaceholder,
            fontWeight: 500,
            textAlign: 'center',
            width: '100%',
          }}
        >
          {displayValue || placeholder}
        </span>

        {/* Hidden Native Input (overlaying entirely) */}
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            zIndex: 2,
            cursor: 'pointer',
            // Remove default appearance
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        />
      </div>
    </div>
  );
};
