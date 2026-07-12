import React, { useState, useEffect } from "react";
import { Globe, ArrowRightLeft, RefreshCw, Plus, Trash2, Loader2, Coins } from "lucide-react";

interface ExchangeRates {
  rates: Record<string, number>;
  time_last_update_utc: string;
}

export const CurrencyView: React.FC = () => {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User defined currencies
  const [myCurrencies, setMyCurrencies] = useState<string[]>(() => {
    const saved = localStorage.getItem("my_currencies");
    return saved ? JSON.parse(saved) : ["USD", "EUR", "GBP", "BDT", "INR"];
  });
  
  const [newCurrency, setNewCurrency] = useState("");

  // Converter state
  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("BDT");
  
  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      // Using open.er-api.com for free exchange rates (no API key required)
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data: ExchangeRates = await res.json();
      setRates(data.rates);
      setLastUpdate(new Date(data.time_last_update_utc).toLocaleString());
    } catch (err: any) {
      setError(err.message || "Failed to load exchange rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    localStorage.setItem("my_currencies", JSON.stringify(myCurrencies));
  }, [myCurrencies]);

  const addCurrency = () => {
    const cur = newCurrency.trim().toUpperCase();
    if (cur && cur.length === 3 && !myCurrencies.includes(cur) && rates[cur]) {
      setMyCurrencies([...myCurrencies, cur]);
      setNewCurrency("");
    } else {
      alert("Invalid currency code or currency not found in exchange rates.");
    }
  };

  const removeCurrency = (cur: string) => {
    if (myCurrencies.length <= 2) {
      alert("You must keep at least 2 currencies.");
      return;
    }
    setMyCurrencies(myCurrencies.filter(c => c !== cur));
    if (fromCurrency === cur) setFromCurrency(myCurrencies[0]);
    if (toCurrency === cur) setToCurrency(myCurrencies[1]);
  };

  const convertAmount = (): string => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return "0.00";
    const amt = parseFloat(amount) || 0;
    // Base is USD in this API
    const amountInUSD = amt / rates[fromCurrency];
    const converted = amountInUSD * rates[toCurrency];
    return converted.toFixed(2);
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Globe className="h-32 w-32" />
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Globe className="h-6 w-6 text-teal-600" />
              Currency Exchange & Rates
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Define your operating currencies and convert amounts using real-time market exchange rates.
            </p>
          </div>
          <button 
            onClick={fetchRates}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Converter Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-teal-500" />
            Currency Converter
          </h3>
          
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">Amount to Convert</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 text-lg font-bold text-slate-800 outline-none focus:border-teal-500"
                />
                <select 
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-teal-500 w-32"
                >
                  {myCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 bg-white p-2 rounded-full border border-slate-200 z-10 hover:bg-slate-50 cursor-pointer shadow-sm" onClick={handleSwap}>
                <ArrowRightLeft className="h-4 w-4 text-slate-400 rotate-90 sm:rotate-0" />
              </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 mt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-teal-600/70 mb-2 block">Converted Amount</label>
              <div className="flex gap-4 items-center">
                <div className="flex-1 bg-white border border-teal-200 rounded-lg px-4 py-3 text-xl font-bold text-teal-800 flex items-center shadow-inner">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin text-teal-500 mr-2" /> : convertAmount()}
                </div>
                <select 
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="bg-white border border-teal-200 rounded-lg px-4 py-3 text-sm font-bold text-teal-800 outline-none focus:border-teal-500 w-32"
                >
                  {myCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            
            <p className="text-center text-xs text-slate-400 font-medium">
              Market rates as of {lastUpdate || "..."}
            </p>
          </div>
        </div>

        {/* Managed Currencies */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-teal-500" />
            Tracked Currencies
          </h3>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value.toUpperCase())}
              placeholder="e.g. AUD, CAD"
              maxLength={3}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 font-mono uppercase"
            />
            <button 
              onClick={addCurrency}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 transition flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-80">
            {myCurrencies.map((cur) => (
              <div key={cur} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm">
                    {cur}
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">1 USD =</span>
                    {loading ? (
                      <span className="text-xs text-slate-400">Loading...</span>
                    ) : (
                      <span className="text-xs font-mono text-slate-500">{rates[cur]?.toFixed(4)} {cur}</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => removeCurrency(cur)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
