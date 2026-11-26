
const moment = require('moment')

let isDev = false
// isDev = true

module.exports = function (app, opts, ctx) {
   const clear = app.fs.scheduleInit(
      {
         interval: '24 47 */3 * * *',
         immediate: isDev,
         proRun: !isDev,
      },
      async () => {
         try {
            const { models } = app.fs.dc
            const { clickHouse } = app.fs;
            let startTime = moment().subtract(1, 'days').format('YYYY-MM-DD 00:00:00')
            const copyFrom = 'diagnosis'
            // const copyFrom = 'diagnosis_local'

            ck = clickHouse.dataAlarm

            let deviceDcount = await ck.query(`
               SELECT
                  DeviceId,
                  COUNT(*) AS record_count
               FROM alarm.${copyFrom}
               WHERE (position('powerstr' in Data) > 0 or position('电量' in Data) > 0 or position('电量%' in Data) > 0) 
                  AND CollectTime >= '${startTime}' 
               GROUP BY DeviceId    
            `).toPromise()

            for (let dc of deviceDcount) {

               let { DeviceId, record_count } = dc

               // DeviceId = '78632f2c-7d5f-41d6-b161-dae3fb471be6' // 测试

               let hasLimit = true
               let page = 0
               let limit = 100000

               let storageRow = {}
               let storageCount = 0

               let rowIndex = 0
               while (hasLimit) {
                  let offset = page * limit
                  let sub = 0 //offset >= limit ? 50000 : 0
                  let curCount = 0
                  let record = []
                  for await (const row of ck.query(`
                        SELECT * FROM alarm.${copyFrom}
                        WHERE DeviceId = '${DeviceId}'
                          AND (position('powerstr' in Data) > 0 or position('电量' in Data) > 0 or position('电量%' in Data) > 0)
                            AND CollectTime >= '${startTime}'
                        LIMIT ${limit} OFFSET ${offset - sub}
                    `).stream()) {
                     //   
                     record.push(row)
                     curCount++
                  }

                  let pkgIndex = 0
                  for (let r of record) {
                     pkgIndex++
                     const { Data, CollectTime } = r
                     const data = JSON.parse(Data)

                     const date = moment(CollectTime).format('YYYY-MM-DD')
                     let power = data['powerstr'] || data['电量'] || data['电量(%)'] || data['电量%']

                     if (!power && power != 0) continue

                     power = parseFloat(power)

                     if (!power && power != 0) continue

                     let rowD = {
                        DeviceId: r.DeviceId,
                        CollectDate: date,
                        CollectTime: r.CollectTime,
                        Power: power,
                        Data: Data
                     }
                     if (!storageRow[date]) {
                        storageCount++
                        storageRow[date] = rowD
                     } else {
                        if (moment(storageRow[date].CollectTime).isBefore(moment(rowD.CollectTime))) {
                           storageRow[date] = rowD
                        }
                     }
                  }
                  record = []

                  if (curCount) {
                     hasLimit = true
                  } else {
                     hasLimit = false
                  }
                  page++
               }

               if (storageCount) {
                  storageRow = Object.values(storageRow)
                  for (let i = 0; i < storageRow.length; i++) {
                     await ck.query(
                        `INSERT INTO fs_data_analysis.diagnosis_daily (DeviceId, CollectDate, CollectTime, Power, Data) VALUES ('${storageRow[i].DeviceId}', '${storageRow[i].CollectDate}', '${storageRow[i].CollectTime}', ${storageRow[i].Power}, '${storageRow[i].Data}')`,
                     ).toPromise()
                  }
               }
               storageRow = {}
               record = []
            }

         } catch (error) {
            console.error('定时清理最新动态数据失误', error)
         }
      }
   );
   return {
      clear,
   }
}
