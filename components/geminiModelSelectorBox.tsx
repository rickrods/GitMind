
// Define the shape of each dropdown option
interface Option {
  label: string;
  value: string;
}

// Define the component's props
interface SelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, label }: SelectProps) {
  return (
    <div className="flex-1 flex-col gap-2">
      {label && <label className="font-medium text-gray-700">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
      >
        <option value="" disabled>Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};