import { CSVData } from './typings/CSVData'
import { FolderData, FolderFile } from './typings/FolderData'
import { LocationData } from './typings/Location'
import { ProcessProgressData } from './typings/ProcessService'
import { exiftool } from 'exiftool-vendored'

export class ProcessService {
  constructor() {
    this._updateCallbacks = []
    return
  }

  public folderData?: FolderData
  public csvData?: CSVData

  private _updateCallbacks: ((progressData: ProcessProgressData) => void | Promise<void>)[]

  public setFolderData(data: FolderData): void {
    this.folderData = data
    this._triggerUpdate({
      processed: 0,
      total: this.getMissingGPSPhotos()?.length || 0
    })
  }
  public setCsvData(data: CSVData): void {
    this.csvData = data
  }

  public getMissingGPSPhotos(): FolderFile[] | undefined {
    if (!this.folderData || !this.folderData.fileList) return
    return this.folderData.fileList.filter(
      ({ metadata }) => !metadata.GPSLatitude || !metadata.GPSLongitude
    )
  }

  public getClosetLocation(time: Date): LocationData | undefined {
    if (!this.csvData || this.csvData.locationDataList.length == 0) return

    const { locationDataList } = this.csvData

    let left = 0
    let right = locationDataList.length - 1

    // 二分查找最接近目标时间的元素
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midTime = locationDataList[mid].time

      if (midTime.getTime() === time.getTime()) {
        // 找到完全匹配的时间，直接返回
        return locationDataList[mid]
      } else if (midTime.getTime() < time.getTime()) {
        // 目标时间在右侧
        left = mid + 1
      } else {
        // 目标时间在左侧
        right = mid - 1
      }
    }

    // 退出循环时，`left` 指向的是比目标时间大的第一个位置，`right` 指向的是比目标时间小的最后一个位置
    const before = locationDataList[right]
    const after = locationDataList[left]

    // 如果都没有找到，则返回 null
    if (!before && !after) return

    // 比较 `before` 和 `after` 的时间差，返回时间差最小的一个
    const beforeDiff = before ? Math.abs(before.time.getTime() - time.getTime()) : Infinity
    const afterDiff = after ? Math.abs(after.time.getTime() - time.getTime()) : Infinity

    return beforeDiff <= afterDiff ? before : after
  }

  public async process(): Promise<void> {
    if (!this.folderData || !this.csvData) return

    const photos = this.getMissingGPSPhotos()

    if (!photos) return

    this._triggerUpdate({
      processed: 0,
      total: photos.length
    })

    for (const [index, photo] of photos.entries()) {
      if (!photo.metadata.DateTimeOriginal) continue

      const time = new Date(photo.metadata.DateTimeOriginal.toString() as string)

      const location = this.getClosetLocation(time)

      if (!location) continue

      try {
        await exiftool.write(photo.filePath, {
          GPSLatitude: location.lat,
          GPSLongitude: location.lng,
          GPSAltitude: location.alt,
          GPSDateTime: location.time.toISOString()
        })
      } catch (error) {
        continue
      }

      this._triggerUpdate({
        processed: index + 1,
        total: photos.length
      })
    }
  }

  public onProcessUpdate(
    callback: (progressData: ProcessProgressData) => void | Promise<void>
  ): void {
    this._updateCallbacks.push(callback)
  }

  private _triggerUpdate(progressData: ProcessProgressData): void {
    this._updateCallbacks.forEach((callback) => callback(progressData))
  }
}
