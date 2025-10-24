"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface UtmOption {
  value: string;
  label: string;
  description?: string;
}

interface UtmDropdownProps {
  options: UtmOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  descriptions?: Record<string, string>;
}

export default function UtmDropdown({
  options,
  value,
  onChange,
  onBlur,
  placeholder = "Select an option...",
  disabled = false,
  label,
  descriptions = {},
}: UtmDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHoveredValue(null);
        onBlur?.();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onBlur]);

  const selectedOption = options.find((opt) => opt.value === value);
  const getDescription = (val: string) => {
    return (
      descriptions[val] ||
      options.find((opt) => opt.value === val)?.description ||
      ""
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-xs text-gray-600 mb-1 block">{label}</label>
      )}

      {/* Main button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => {
          // Only close if not clicking inside dropdown
          if (!isOpen) {
            onBlur?.();
          }
        }}
        disabled={disabled}
        className="w-full text-sm border border-gray-300 rounded-lg p-2 text-gray-900 flex items-center justify-between bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>
          {selectedOption
            ? selectedOption.label
            : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No options</div>
          ) : (
            options.map((option, index) => (
              <div
                key={option.value}
                onMouseEnter={(e) => {
                  setHoveredValue(option.value);
                  // Calculate position relative to viewport
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({
                    top: rect.top,
                    left: rect.left - 10, // 10px to the left of the option
                  });
                }}
                onMouseLeave={() => {
                  setHoveredValue(null);
                  setTooltipPos(null);
                }}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setHoveredValue(null);
                  setTooltipPos(null);
                  onBlur?.();
                }}
                className={`p-2 cursor-pointer text-sm transition-colors ${
                  value === option.value
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : hoveredValue === option.value
                      ? "bg-gray-100"
                      : "text-gray-900 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tooltip rendered via portal - always visible */}
      {hoveredValue && tooltipPos && getDescription(hoveredValue) && typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] w-48 bg-gray-900 text-white text-xs rounded p-2 whitespace-normal break-words pointer-events-none"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: "translateY(-50%)",
            }}
          >
            {getDescription(hoveredValue)}
          </div>,
          document.body
        )
      }
    </div>
  );
}
