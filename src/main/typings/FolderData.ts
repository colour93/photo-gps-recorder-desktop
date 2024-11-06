import { Tags } from 'exiftool-vendored'

export type FolderData = {
  folderPath: string
  fileList: FolderFile[]
}

export type FolderFile = {
  fileName: string
  filePath: string
  metadata: Partial<Tags>
}
