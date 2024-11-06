import { Button, Table, Toast } from '@douyinfe/semi-ui'
import { ReactNode, useState } from 'react'
import { SelectFolderResult } from './typings/SelectFolder'

function App(): JSX.Element {
  const [selecting, setSelecting] = useState(false)
  const [selectedFolderData, setSelectedFolderData] = useState<SelectFolderResult | undefined>()

  const handleSelectFolderClick = async (): Promise<void> => {
    setSelecting(true)
    const result = await window.electron.ipcRenderer.invoke('dialog:selectFolder')
    setSelecting(false)
    if (!result) {
      Toast.error('Folder not selected or multiple folders selected')
      return
    }
    setSelectedFolderData(result)
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button loading={selecting} onClick={handleSelectFolderClick}>
            Select Folder
          </Button>
          <Button>Select GPS Data (PGR-CSV-Format)</Button>
        </div>

        {selectedFolderData ? (
          <>
            <span>Selected Folder Path: {selectedFolderData.folderPath}</span>
            <Table
              columns={[
                {
                  title: 'File Name',
                  dataIndex: 'fileName'
                },
                {
                  title: 'File Path',
                  dataIndex: 'filePath'
                },
                {
                  title: 'GPS',
                  dataIndex: 'gpsMetadata',
                  render: (_text, record): ReactNode => {
                    const { metadata } = record
                    return metadata.GPSLatitude && metadata.GPSLongitude ? 't' : 'f'
                  }
                },
                {
                  title: 'Lat',
                  dataIndex: 'metadata.GPSLatitude'
                },
                {
                  title: 'Lng',
                  dataIndex: 'metadata.GPSLongitude'
                },
                {
                  title: 'Alt',
                  dataIndex: 'metadata.GPSAltitude'
                }
              ]}
              dataSource={selectedFolderData.fileList}
            />
          </>
        ) : (
          <span>Folder not selected yet</span>
        )}
      </div>
    </>
  )
}

export default App
