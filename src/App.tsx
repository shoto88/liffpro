
import Number1 from "./components/Number1.tsx";
import Form1 from "./components/Form";
import "../app/globals.css"
import { Route, Routes } from 'react-router-dom';
const App = () => {
  return (
  <div>
  
  <div>
    <Routes>
      <Route path="/" element={<Number1 />} />
      <Route path="/form" element={<Form1 />} />
    </Routes>
  </div>
  </div>
  )
  }

  export default App;