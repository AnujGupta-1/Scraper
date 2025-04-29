import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader, Download } from "lucide-react";

export default function Dashboard() {
  const [oddsData, setOddsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastScraped, setLastScraped] = useState(null);
  const [nextScrape, setNextScrape] = useState(null);

  const fetchOddsWithResults = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/odds-with-results");
      const data = await response.json();
      setOddsData(data);
      const now = new Date();
      setLastScraped(now);
      setNextScrape(new Date(now.getTime() + 5 * 60000));
    } catch (error) {
      console.error("Error fetching odds data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = "Match,Bookmaker Odds,Actual Result,Comparison\n";
    const rows = oddsData.map(item => `${item.match},${item.bookmaker_odds},${item.actual_result},${item.comparison}`).join("\n");
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "odds_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchOddsWithResults();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="text-3xl font-bold mb-8 text-center">OddsScraper Dashboard</header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500">Total Matches</p>
            <p className="text-2xl font-bold">{oddsData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500">Bookmakers</p>
            <p className="text-2xl font-bold">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500">Last Scraped</p>
            <p className="text-2xl font-bold">{lastScraped ? lastScraped.toLocaleTimeString() : "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500">Next Scrape</p>
            <p className="text-2xl font-bold">{nextScrape ? nextScrape.toLocaleTimeString() : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh and Export Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <Button onClick={fetchOddsWithResults} disabled={loading}>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader className="animate-spin" size={18} /> Loading...
            </div>
          ) : (
            "Refresh Odds"
          )}
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <div className="flex items-center gap-2">
            <Download size={18} /> Export to CSV
          </div>
        </Button>
      </div>

      {/* Odds Table */}
      <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-gray-600 pb-2">Match</th>
              <th className="text-left text-gray-600 pb-2">Bookmaker Odds</th>
              <th className="text-left text-gray-600 pb-2">Actual Result</th>
              <th className="text-left text-gray-600 pb-2">Comparison</th>
            </tr>
          </thead>
          <tbody>
            {oddsData.map((item, index) => (
              <tr key={index} className="border-t">
                <td className="py-2">{item.match}</td>
                <td className="py-2">{item.bookmaker_odds}</td>
                <td className="py-2">{item.actual_result}</td>
                <td className="py-2 font-semibold">
                  {item.comparison === "Correct" ? (
                    <span className="text-green-600">{item.comparison}</span>
                  ) : (
                    <span className="text-red-600">{item.comparison}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
