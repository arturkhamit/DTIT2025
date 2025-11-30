import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import About from "./pages/About/About";
import Contact from "./pages/Contact/Contact";
import LiquidChrome from "./components/LiquidChrome/LiquidChrome";
import Calendar from "./pages/Calendar/Calendar";

function App() {
  return (
    <div className='app-container'>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "fixed",
          zIndex: -100,
        }}
      >
        <LiquidChrome
          baseColor={[0.1, 0, 0.1]}
          speed={0.05}
          amplitude={.4}
          interactive={false}
        />
      </div>
      <Header />
      <Routes>
        <Route path='/' element={<About />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/calendar' element={<Calendar />} />
      </Routes>
      {/* <Footer /> */}
    </div>
  );
}

export default App;
