import { useState } from 'react';
import Home from './flows/Home.jsx';
import ImportTestCase from './flows/ImportTestCase.jsx';
import CreateExecution from './flows/CreateExecution.jsx';
import ExecutionList from './flows/ExecutionList.jsx';
import RunExecution from './flows/RunExecution.jsx';
import FinishExecution from './flows/FinishExecution.jsx';
import PdfViewer from './flows/PdfViewer.jsx';

// Router sederhana: satu layar per flow. nav('run', { id }) membuka layar Run untuk execution tertentu.
export default function App() {
  const [route, setRoute] = useState({ name: 'home' });
  const nav = (name, params = {}) => setRoute({ name, ...params });

  switch (route.name) {
    case 'import':   return <ImportTestCase nav={nav} />;
    case 'create':   return <CreateExecution nav={nav} />;
    case 'list':     return <ExecutionList nav={nav} />;
    case 'run':      return <RunExecution id={route.id} nav={nav} />;
    case 'finish':   return <FinishExecution id={route.id} nav={nav} />;
    case 'pdf':      return <PdfViewer id={route.id} from={route.from} nav={nav} />;
    default:         return <Home nav={nav} />;
  }
}
