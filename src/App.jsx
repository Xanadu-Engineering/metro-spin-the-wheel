import { Routes, Route } from "react-router-dom";
import SpinWheel from "./components/Wheel";
import ResultPage from "./components/ResultPage";

export default function App() {
  return (
    <div className="metro-app-shell">
      <Routes>
        <Route path="/" element={<SpinWheel />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </div>
  );
}
