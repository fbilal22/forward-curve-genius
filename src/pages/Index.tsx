import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useState } from 'react';
import Papa from 'papaparse';
import ProductConfig from '@/components/forward-curve/ProductConfig';
import MaturitySelector, { MONTHS } from '@/components/forward-curve/MaturitySelector';
import FileUploader from '@/components/forward-curve/FileUploader';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [deliveryDates, setDeliveryDates] = useState([]);
  const [commodity, setCommodity] = useState('');
  const [currency, setCurrency] = useState('');
  const [filesData, setFilesData] = useState({});
  const [mergedData, setMergedData] = useState([]);
  const [fileMaturityMap, setFileMaturityMap] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [curveData, setCurveData] = useState([]);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState([]);

  const handleAddDeliveryDate = (month, year) => {
    if (!month || !year) {
      setError("Veuillez sélectionner un mois et une année");
      return;
    }

    const monthLabel = MONTHS.find(m => m.value === month).label;
    const maturityLabel = `${monthLabel} ${year}`;
    const maturityId = `${year}-${month}`;

    if (deliveryDates.some(d => d.id === maturityId)) {
      setError("Cette maturité existe déjà");
      return;
    }

    setDeliveryDates([
      ...deliveryDates,
      {
        month: month,
        year: year,
        label: maturityLabel,
        id: maturityId
      }
    ].sort((a, b) => a.id.localeCompare(b.id)));

    setError("");
    toast({
      title: "Maturité ajoutée",
      description: `${maturityLabel} a été ajouté avec succès.`,
    });
  };

  const handleRemoveDeliveryDate = (maturityId) => {
    setDeliveryDates(deliveryDates.filter(d => d.id !== maturityId));
    toast({
      title: "Maturité supprimée",
      description: "La maturité a été supprimée avec succès.",
    });
  };

  const parsePrice = (priceStr) => {
    if (!priceStr) return null;
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, ''));
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const handleFileUpload = async (event) => {
    if (deliveryDates.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez définir les maturités avant d'uploader des fichiers",
        variant: "destructive",
      });
      return;
    }

    const uploadedFiles = event.target.files;
    const newFilesData = {};

    for (let file of uploadedFiles) {
      try {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          encoding: "utf-8"
        });

        const processedData = result.data
          .filter(row => row.Date && row.Price)
          .map(row => ({
            date: parseDate(row.Date),
            price: parsePrice(row.Price)
          }))
          .filter(row => row.date && row.price !== null);

        newFilesData[file.name] = processedData;
        
        toast({
          title: "Fichier traité",
          description: `${file.name} a été traité avec succès.`,
        });
      } catch (err) {
        toast({
          title: "Erreur",
          description: `Erreur lors de la lecture du fichier ${file.name}: ${err.message}`,
          variant: "destructive",
        });
        return;
      }
    }

    setFilesData(newFilesData);
    setFileMaturityMap(
      Object.keys(newFilesData).reduce((acc, fileName) => ({
        ...acc,
        [fileName]: ''
      }), {})
    );
  };

  const handleMaturityAssignment = (fileName, maturityId) => {
    setFileMaturityMap(prev => ({
      ...prev,
      [fileName]: maturityId
    }));
  };

  const mergeTables = () => {
    try {
      const unmappedFiles = Object.entries(fileMaturityMap)
        .filter(([_, maturity]) => !maturity)
        .map(([fileName]) => fileName);

      if (unmappedFiles.length > 0) {
        setError(`Veuillez assigner une maturité à tous les fichiers : ${unmappedFiles.join(', ')}`);
        return;
      }

      const allDates = new Set();
      Object.values(filesData).forEach(fileData => {
        fileData.forEach(row => allDates.add(row.date));
      });

      const datesList = Array.from(allDates).sort();
      
      const merged = datesList.map(date => {
        const rowData = { date };
        
        Object.entries(fileMaturityMap).forEach(([fileName, maturityId]) => {
          if (!filesData[fileName]) {
            console.error(`Données manquantes pour le fichier ${fileName}`);
            return;
          }
          
          const fileData = filesData[fileName];
          const priceData = fileData.find(d => d.date === date);
          
          if (priceData) {
            rowData[maturityId] = priceData.price;
          } else {
            rowData[maturityId] = null;
          }
        });
        
        return rowData;
      });

      if (merged.length === 0) {
        setError("Aucune donnée n'a pu être fusionnée. Vérifiez le format des fichiers.");
        return;
      }

      setMergedData(merged);
      setPreviewData(merged.slice(0, 5));
      setError('');
      
      toast({
        title: "Succès",
        description: "Les données ont été fusionnées avec succès.",
      });
    } catch (error) {
      console.error("Erreur complète:", error);
      setError(`Erreur lors de la fusion des données: ${error.message}`);
    }
  };

  const generateCurve = () => {
    if (!selectedDate || !mergedData.length) {
      setError("Veuillez sélectionner une date valide");
      return;
    }

    const dayData = mergedData.find(row => row.date === selectedDate);
    
    if (!dayData) {
      setError("Aucune donnée trouvée pour cette date");
      return;
    }

    const selectedDateObj = new Date(selectedDate);
    
    const newCurveData = deliveryDates
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(delivery => {
        const maturityDate = new Date(delivery.year, parseInt(delivery.month) - 1);
        const monthName = MONTHS.find(m => m.value === delivery.month).label;
        const displayLabel = `${monthName} ${delivery.year}`;
        
        return {
          maturity: delivery.id,
          displayLabel,
          price: dayData[delivery.id]
        };
      })
      .filter(point => point.price !== null);

    setCurveData(newCurveData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <Card className="backdrop-blur-sm bg-white/80">
          <CardHeader>
            <CardTitle className="text-2xl font-light tracking-wide mb-2">
              Générateur de Courbes Forward
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <ProductConfig
              commodity={commodity}
              currency={currency}
              onCommodityChange={setCommodity}
              onCurrencyChange={setCurrency}
            />
            
            <MaturitySelector
              deliveryDates={deliveryDates}
              onAddDeliveryDate={handleAddDeliveryDate}
              onRemoveDeliveryDate={handleRemoveDeliveryDate}
              error={error}
            />

            <FileUploader
              onFileUpload={handleFileUpload}
              disabled={deliveryDates.length === 0}
            />

            {Object.keys(filesData).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium">Assigner les maturités aux fichiers</h3>
                {Object.keys(filesData).map(fileName => (
                  <div key={fileName} className="flex items-center gap-4">
                    <span className="min-w-40">{fileName}:</span>
                    <select
                      value={fileMaturityMap[fileName]}
                      onChange={(e) => handleMaturityAssignment(fileName, e.target.value)}
                      className="p-2 border rounded-md bg-white flex-1"
                    >
                      <option value="">Sélectionner une maturité</option>
                      {deliveryDates.map(delivery => (
                        <option key={delivery.id} value={delivery.id}>
                          {delivery.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <Button onClick={mergeTables} className="mt-4">
                  Fusionner les données
                </Button>
              </motion.div>
            )}

            {previewData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Aperçu des données</h3>
                  <Button
                    onClick={() => {
                      const csv = Papa.unparse(mergedData);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'donnees_fusionnees.csv';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    variant="outline"
                  >
                    Télécharger les données
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-border">
                    <thead>
                      <tr>
                        <th className="border border-border p-2 bg-muted">
                          Date
                        </th>
                        {Object.keys(previewData[0] || {})
                          .filter(key => key !== 'date')
                          .sort((a, b) => a.localeCompare(b))
                          .map(maturityId => (
                            <th key={maturityId} className="border border-border p-2 bg-muted">
                              {deliveryDates.find(d => d.id === maturityId)?.label || maturityId}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="border border-border p-2">
                            {row.date}
                          </td>
                          {Object.keys(row)
                            .filter(key => key !== 'date')
                            .sort((a, b) => a.localeCompare(b))
                            .map((maturityId, cellIdx) => (
                              <td key={cellIdx} className="border border-border p-2">
                                {typeof row[maturityId] === 'number' ? row[maturityId].toFixed(2) : '-'}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {mergedData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-medium">Visualiser la courbe</h3>
                <div className="flex gap-4">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40"
                  />
                  <Button onClick={generateCurve}>
                    Générer la courbe
                  </Button>
                </div>

                {curveData.length > 0 && (
                  <div className="h-96 mt-4">
                    <LineChart
                      width={800}
                      height={400}
                      data={curveData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="displayLabel"
                        label={{ value: 'Maturité', position: 'bottom' }}
                        tick={{ angle: -45 }}
                        height={60}
                      />
                      <YAxis
                        label={{ value: 'Prix', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value) => value.toFixed(2)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#8884d8"
                        name="Prix Forward"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Index;
