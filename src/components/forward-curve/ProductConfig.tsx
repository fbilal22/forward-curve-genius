
import React from 'react';
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface ProductConfigProps {
  commodity: string;
  currency: string;
  onCommodityChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}

const ProductConfig = ({ commodity, currency, onCommodityChange, onCurrencyChange }: ProductConfigProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-medium">Configuration du produit</h3>
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            value={commodity}
            onChange={(e) => onCommodityChange(e.target.value)}
            placeholder="Matière première (ex: Wheat, Corn...)"
            className="w-full font-light"
          />
        </div>
        <div className="w-32">
          <Input
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            placeholder="Devise"
            className="w-full font-light"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProductConfig;
