"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    size?: "sm" | "md" | "lg";
  }
>(({ className, children, size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs rounded-lg",
    md: "h-9 px-3 text-xs sm:text-sm rounded-xl",
    lg: "h-10 px-3.5 text-sm rounded-xl",
  }[size];

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between gap-2 border border-borderGray bg-white text-text-primary shadow-2xs transition-all cursor-pointer font-medium hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses,
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate text-left flex-1 min-w-0">
        {children}
      </div>
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-60 shrink-0 text-text-muted transition-transform duration-200" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] max-h-72 overflow-hidden rounded-xl border border-borderGray bg-white text-text-primary shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5 max-h-64 overflow-y-auto",
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-3 text-xs sm:text-sm font-medium text-text-primary outline-none transition-colors hover:bg-brand/10 hover:text-brand focus:bg-brand/10 focus:text-brand data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[state=checked]:bg-brand/10 data-[state=checked]:text-brand data-[state=checked]:font-semibold",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-brand" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export interface SelectOption {
  value: string | number;
  label: React.ReactNode;
  icon?: React.ElementType;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  prefix?: React.ReactNode;
  name?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
}

const EMPTY_VALUE_TOKEN = "__EMPTY_VALUE__";

export function CustomSelect({
  value,
  defaultValue,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  prefix,
  id,
  name,
  size = "md",
}: CustomSelectProps) {
  const toInternal = (val: string | number | undefined) =>
    val === "" || val === undefined ? EMPTY_VALUE_TOKEN : String(val);

  const fromInternal = (val: string) =>
    val === EMPTY_VALUE_TOKEN ? "" : val;

  const internalValue = value !== undefined ? toInternal(value) : undefined;
  const internalDefaultValue = defaultValue !== undefined ? toInternal(defaultValue) : undefined;

  return (
    <div className={cn("relative inline-block min-w-[7rem]", className)}>
      <Select
        value={internalValue}
        defaultValue={internalDefaultValue}
        onValueChange={(val) => {
          if (onChange) onChange(fromInternal(val));
        }}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger id={id} size={size} className={triggerClassName}>
          {prefix && <span className="text-text-muted shrink-0 mr-1">{prefix}</span>}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((opt) => {
            const optVal = toInternal(opt.value);
            const Icon = opt.icon;
            return (
              <SelectItem
                key={optVal}
                value={optVal}
                disabled={opt.disabled}
              >
                <div className="flex items-center gap-2 truncate">
                  {Icon && <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
};
