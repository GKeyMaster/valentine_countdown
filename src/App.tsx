import { Globe } from './components/Globe'
import { HeaderBar } from './components/HeaderBar'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import './styles/theme.css'

function App() {
  return (
    <>
      <Globe />
      <HeaderBar />
    </>
  )
}

export default App