import { Button, Toast } from '@douyinfe/semi-ui'
import { useState } from 'react'
import { SelectFolderResult } from './typings/SelectFolder'

function App(): JSX.Element {
  const [selecting, setSelecting] = useState(false)
  const [selectedFolderData, setSelectedFolderData] = useState<SelectFolderResult | undefined>()

  const handleSelectFolderClick = async () => {
    setSelecting(true)
    const result = await window.electron.ipcRenderer.invoke('dialog:selectFolder')
    setSelecting(false)
    if (!result) {
      Toast.error('Folder not selected or multiple folders selected')
      return
    }
    setSelectedFolderData(result)
    console.log(result)
  }

  return (
    <>
      <Button loading={selecting} onClick={handleSelectFolderClick}>
        Select Folder
      </Button>
      {selectedFolderData ? (
        <span>Selected Folder Path: {selectedFolderData.folderPath}</span>
      ) : (
        <span>Folder not selected yet</span>
      )}
    </>
  )
}

export default App
