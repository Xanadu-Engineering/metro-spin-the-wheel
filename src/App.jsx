import { Routes, Route } from "react-router-dom";
import SpinWheel from "./components/Wheel";
import ResultPage from "./components/ResultPage";

export default function App() {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/homeBg.png')` }}
    >
      <Routes>
        <Route path="/" element={<SpinWheel />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </div>
  );
}
