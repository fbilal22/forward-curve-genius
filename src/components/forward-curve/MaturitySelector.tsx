
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const MONTHS = [
  { value: "01", label: "Janvier" },
  { value: "02", label: "Février" },
  { value: "03", label: "Mars" },
  { value: "04", label: "Avril" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juin" },
  { value: "07", label: "Juillet" },
  { value: "08", label: "Août" },
  { value: "09", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" }
];

interface DeliveryDate {
  month: string;
  year: string;
  label: string;
  id: string;
}

interface MaturitySelectorProps {
  deliveryDates: DeliveryDate[];
  onAddDeliveryDate: (month: string, year: string) => void;
  onRemoveDeliveryDate: (id: string) => void;
  error?: string;
}

const MaturitySelector = ({ deliveryDates, onAddDeliveryDate, onRemoveDeliveryDate, error }: MaturitySelectorProps) => {
  const [newMonth, setNewMonth] = React.useState("");
  const [newYear, setNewYear] = React.useState("");

  const handleAdd = () => {
    onAddDeliveryDate(newMonth, newYear);
    setNewMonth("");
    setNewYear("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-medium">Définir les maturités</h3>
      <div className="flex gap-4 items-center">
        <select
          value={newMonth}
          onChange={(e) => setNewMonth(e.target.value)}
          className="p-2 border rounded-md bg-white"
        >
          <option value="">Mois</option>
          {MONTHS.map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min="2024"
          max="2030"
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          placeholder="Année"
          className="w-24"
        />
        <Button onClick={handleAdd} variant="outline">
          Ajouter
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {deliveryDates.map(delivery => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm"
            >
              {delivery.label}
              <button
                onClick={() => onRemoveDeliveryDate(delivery.id)}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-sm"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};

export default MaturitySelector;
