import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label } from 'recharts';
import { useState } from 'react';
import Papa from 'papaparse';
import ProductConfig from '@/components/forward-curve/ProductConfig';
import MaturitySelector, { MONTHS } from '@/components/forward-curve/MaturitySelector';
import FileUploader from '@/components/forward-curve/FileUploader';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

interface DeliveryDate {
  month: string;
  year: string;
  label: string;
  id: string;
}

interface PriceData {
  date: string;
  price: number;
}

interface FileData {
  [key: string]: PriceData[];
}

interface MergedDataRow {
  date: string;
  [key: string]: number | string | null;
}

const Index = () => {
  const { toast } = useToast();
  const [deliveryDates, setDeliveryDates] = useState<DeliveryDate[]>([]);
  const [commodity, setCommodity] = useState('');
  const [currency, setCurrency] = useState('');
  const [filesData, setFilesData] = useState<FileData>({});
  const [spotData, setSpotData] = useState<PriceData[]>([]);
  const [mergedData, setMergedData] = useState<MergedDataRow[]>([]);
  const [fileMaturityMap, setFileMaturityMap] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [curveData, setCurveData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<MergedDataRow[]>([]);

  const handleSpotFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    try {
      const text = await file.text();
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        encoding: "utf-8"
      });

      const processedData = result.data
        .filter((row: any) => row.Date && row.Price)
        .map((row: any) => ({
          date: parseDate(row.Date),
          price: parsePrice(row.Price)
        }))
        .filter((row: any) => row.date && row.price !== null);

      setSpotData(processedData);
      toast({
        title: "Données spot chargées",
        description: "Le fichier des prix spot a été traité avec succès.",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: `Erreur lors de la lecture du fichier spot: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        variant: "destructive",
      });
    }
  };

  const handleAddDeliveryDate = (month: string, year: string) => {
    if (!month || !year) {
      setError("Veuillez sélectionner un mois et une année");
      return;
    }

    const monthLabel = MONTHS.find(m => m.value === month)?.label;
    if (!monthLabel) return;
    
    const maturityLabel = `${monthLabel} ${year}`;
    const maturityId = `${year}-${month}`;

    if (deliveryDates.some(d => d.id === maturityId)) {
      setError("Cette maturité existe déjà");
      return;
    }

    setDeliveryDates([
      ...deliveryDates,
      {
        month,
        year,
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

  const parsePrice = (priceStr: string) => {
    if (!priceStr) return null;
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, ''));
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length || deliveryDates.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez définir les maturités avant d'uploader des fichiers",
        variant: "destructive",
      });
      return;
    }

    const uploadedFiles = event.target.files;
    const newFilesData: FileData = {};

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      try {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          encoding: "utf-8"
        });

        const processedData = (result.data as any[])
          .filter(row => row.Date && row.Price)
          .map(row => ({
            date: parseDate(row.Date),
            price: parsePrice(row.Price)
          }))
          .filter((row): row is PriceData => row.date !== null && row.price !== null);

        newFilesData[file.name] = processedData;
        
        toast({
          title: "Fichier traité",
          description: `${file.name} a été traité avec succès.`,
        });
      } catch (err) {
        toast({
          title: "Erreur",
          description: `Erreur lors de la lecture du fichier ${file.name}: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
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

  const mergeTables = () => {
    try {
      const unmappedFiles = Object.entries(fileMaturityMap)
        .filter(([_, maturity]) => !maturity)
        .map(([fileName]) => fileName);

      if (unmappedFiles.length > 0) {
        setError(`Veuillez assigner une maturité à tous les fichiers : ${unmappedFiles.join(', ')}`);
        return;
      }

      const allDates = new Set<string>();
      Object.values(filesData).forEach(fileData => {
        fileData.forEach(row => allDates.add(row.date));
      });
      
      if (spotData.length > 0) {
        spotData.forEach(row => allDates.add(row.date));
      }

      const datesList = Array.from(allDates).sort().reverse();

      const merged = datesList.map(date => {
        const rowData: MergedDataRow = { date };
        
        if (spotData.length > 0) {
          const spotPrice = spotData.find(d => d.date === date);
          if (spotPrice) {
            rowData.spot = spotPrice.price;
          }
        }
        
        Object.entries(fileMaturityMap).forEach(([fileName, maturityId]) => {
          const fileData = filesData[fileName];
          if (!fileData) return;
          
          const priceData = fileData.find(d => d.date === date);
          rowData[maturityId] = priceData?.price ?? null;
        });
        
        return rowData;
      });

      setMergedData(merged);
      setPreviewData(merged.slice(0, 5));
      setError('');
      
      toast({
        title: "Succès",
        description: "Les données ont été fusionnées avec succès.",
      });
    } catch (error) {
      setError(`Erreur lors de la fusion des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

    const newCurveData = [
      ...(dayData.spot !== undefined ? [{
        maturity: 'spot',
        displayLabel: 'Spot',
        price: dayData.spot
      }] : []),
      ...deliveryDates
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(delivery => {
          const monthName = MONTHS.find(m => m.value === delivery.month)?.label;
          const displayLabel = `${monthName} ${delivery.year}`;
          
          return {
            maturity: delivery.id,
            displayLabel,
            price: dayData[delivery.id]
          };
        })
    ].filter(point => point.price !== null);

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
              onRemoveDeliveryDate={(id) => {
                setDeliveryDates(deliveryDates.filter(d => d.id !== id));
                toast({
                  title: "Maturité supprimée",
                  description: "La maturité a été supprimée avec succès.",
                });
              }}
              error={error}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Données historiques spot (optionnel)</h3>
              <input
                type="file"
                accept=".csv"
                onChange={handleSpotFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

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
                      onChange={(e) => setFileMaturityMap(prev => ({
                        ...prev,
                        [fileName]: e.target.value
                      }))}
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
                        {spotData.length > 0 && (
                          <th className="border border-border p-2 bg-muted">Spot</th>
                        )}
                        {Object.keys(previewData[0] || {})
                          .filter(key => key !== 'date' && key !== 'spot')
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
                          {spotData.length > 0 && (
                            <td className="border border-border p-2">
                              {typeof row.spot === 'number' ? row.spot.toFixed(2) : '-'}
                            </td>
                          )}
                          {Object.keys(row)
                            .filter(key => key !== 'date' && key !== 'spot')
                            .sort((a, b) => a.localeCompare(b))
                            .map((maturityId, cellIdx) => (
                              <td key={cellIdx} className="border border-border p-2">
                                {typeof row[maturityId] === 'number' ? (row[maturityId] as number).toFixed(2) : '-'}
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
                        height={60}
                      >
                        <Label value="Maturité" offset={0} position="bottom" />
                      </XAxis>
                      <YAxis>
                        <Label value="Prix" angle={-90} position="insideLeft" />
                      </YAxis>
                      <Tooltip
                        formatter={(value: number) => value.toFixed(2)}
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

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-sm"
              >
                {error}
              </motion.p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Index;
