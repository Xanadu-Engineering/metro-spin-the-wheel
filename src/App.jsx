import SpinWheel from "./components/Wheel";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
      <div className=" ">
        {/* <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Spin the Wheel!</h1>
        <p className="text-center text-gray-600 mb-8">Try your luck and win exciting prizes!</p> */}
        <SpinWheel />
      </div>
    </div>
  );
}