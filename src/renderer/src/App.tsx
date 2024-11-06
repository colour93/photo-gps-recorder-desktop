import { Button, Collapsible, Progress, Table, Toast, Typography } from '@douyinfe/semi-ui'
import { ReactNode, useEffect, useState } from 'react'
import { FolderData } from './typings/FolderData'
import { CSVData } from './typings/CSVData'
import { IconChevronDown, IconChevronRight } from '@douyinfe/semi-icons'

function App(): JSX.Element {
  const [folderSelecting, setFolderSelecting] = useState(false)
  const [csvSelecting, setCsvSelecting] = useState(false)
  const [selectedFolderData, setSelectedFolderData] = useState<FolderData | undefined>()
  const [csvData, setCsvData] = useState<CSVData | undefined>()

  const [isSelectedFolderTableOpen, setIsSelectedFolderTableOpen] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState({
    processed: 0,
    total: 0
  })

  useEffect(() => {
    window.electron.ipcRenderer.invoke('event:getData').then(({ csvData, folderData }) => {
      setCsvData(csvData)
      setSelectedFolderData(folderData)
    })
    window.electron.ipcRenderer.on(
      'event:processDataUpdate',
      (_event, data: { processed: number; total: number }) => {
        console.log(data)
        setProcessProgress(data)
        if (data.total != 0 && data.processed === data.total) {
          Toast.success('Process succeed')
          setIsProcessing(false)
        }
      }
    )
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('event:processDataUpdate')
    }
  }, [])

  const handleSelectFolderClick = async (): Promise<void> => {
    setFolderSelecting(true)
    const result = await window.electron.ipcRenderer.invoke('dialog:selectFolder')
    setFolderSelecting(false)
    if (!result) {
      Toast.error('Folder not selected or multiple folders selected')
      return
    }
    setSelectedFolderData(result)
  }

  const handleSelectCsvClick = async (): Promise<void> => {
    setCsvSelecting(true)
    const result = await window.electron.ipcRenderer.invoke('dialog:selectCsv')
    setCsvSelecting(false)
    if (!result) {
      Toast.error('CSV file not selected or multiple files selected')
      return
    }
    setCsvData(result)
  }

  const handleProcess = async (): Promise<void> => {
    if (processProgress.total == 0) {
      Toast.info('No photos to process')
      return
    }
    setIsProcessing(true)
    await window.electron.ipcRenderer.invoke('event:process')
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <Button loading={folderSelecting} onClick={handleSelectFolderClick}>
            Select Folder
          </Button>
          <Button loading={csvSelecting} onClick={handleSelectCsvClick}>
            Select GPS Data (PGR-CSV-Format)
          </Button>
          {selectedFolderData && csvData && (
            <>
              <Button theme="solid" loading={isProcessing} onClick={handleProcess}>
                Process
              </Button>
              <Progress
                percent={
                  processProgress.total === 0
                    ? 0
                    : (processProgress.processed / processProgress.total) * 100
                }
                aria-label="process progress"
                className="flex-1"
              />
              <div>
                {processProgress.processed} / {processProgress.total}
              </div>
            </>
          )}
        </div>

        {selectedFolderData ? (
          <>
            <div className="flex gap-2 items-center">
              <Typography.Text
                icon={isSelectedFolderTableOpen ? <IconChevronDown /> : <IconChevronRight />}
                link
                onClick={() => setIsSelectedFolderTableOpen(!isSelectedFolderTableOpen)}
                className="w-20"
              >
                {isSelectedFolderTableOpen ? 'Collapse' : 'Expand'}
              </Typography.Text>
              <span>Selected folder path: {selectedFolderData.folderPath}</span>
            </div>
            <Collapsible isOpen={isSelectedFolderTableOpen}>
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
                    title: 'Date',
                    dataIndex: 'metadata.DateTimeOriginal.rawValue'
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
            </Collapsible>
          </>
        ) : (
          <span>Folder not selected yet</span>
        )}
        {csvData ? (
          <span>Selected CSV file path: {csvData.filePath}</span>
        ) : (
          <span>CSV file not selected yet</span>
        )}
      </div>
    </>
  )
}

export default App
