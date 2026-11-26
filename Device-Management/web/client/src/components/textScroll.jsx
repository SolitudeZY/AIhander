import React, { useRef, useEffect, useState } from 'react'
import moment from 'moment'
import './textScroll.less'

function TextScroll (props) {
   const { content, duration, roll, videoObj = {} } = props
   const [showContent, setShowContent] = useState('')
   const showIndex = useRef(0)
   const initialization = useRef(false)
   const cancel = useRef(false)
   let videoObjId = videoObj.id || 0
   useEffect(() => {
      if (content.length) {
         if (roll) {
            let contentParent = document.getElementById("marquee_box" + videoObjId)
            document.getElementById('contentPMakeUp' + videoObjId).style.width = contentParent.clientWidth + 'px'
            const contentP = document.getElementById('contentP' + videoObjId)
            contentP.style.visibility = 'visible'
            setShowContent(content[0])
            window.cancelAnimationFrame(cancel.current)
            contentParent.scrollLeft = 0
            initialization.current = false
            showIndex.current = 0
         }
         else {
            let repeatTime = moment()
            let refreshTime = moment()
            const scroll = () => {
               let contentParent = document.getElementById("marquee_box" + videoObjId)
               document.getElementById('contentPMakeUp' + videoObjId).style.width = contentParent.clientWidth + 'px'
               //初始化
               // if(!showContent&&!initialization.current){
               if (!initialization.current) {
                  const contentP = document.getElementById('contentP' + videoObjId)
                  contentParent.scrollLeft = 0
                  setShowContent(content[showIndex.current])
                  showIndex.current = (showIndex.current + 1) % content.length
                  contentP.style.visibility = 'visible'
                  initialization.current = true
               }
               // 控制频率
               if (moment().diff(refreshTime) > 1000 / 60) {
                  const contentP = document.getElementById('contentP' + videoObjId)
                  // 静态等待时间
                  if (moment().diff(repeatTime) > 1000 * 1.5) {
                     contentP.style.visibility = 'visible'
                  }
                  // 滚动
                  if (moment().diff(repeatTime) > 1000 * 3) {
                     contentParent.scrollLeft = contentParent.scrollLeft + 1
                  }
                  // 滚完 重置
                  if (contentParent.scrollLeft >= contentP.clientWidth + 24) {
                     contentParent.scrollLeft = 0
                     repeatTime = moment()
                     setShowContent(content[showIndex.current])
                     showIndex.current = (showIndex.current + 1) % content.length
                     contentP.style.visibility = 'hidden'
                  }
                  refreshTime = moment()
               }
               let text = null
               text = window.requestAnimationFrame(scroll)
               cancel.current = text
            }
            window.requestAnimationFrame(scroll)
         }
      }
   }, [content, roll])
   return (
      <div className="marquee_box" id={"marquee_box" + videoObjId} style={{ overflow: 'hidden', color: '#F9F9F9' }} >
         <div style={{ position: 'relative', left: 24 }}>
            <div id={'contentP' + videoObjId} style={{ display: 'inline-block', visibility: 'hidden' }}>{showContent}</div>
            <div id={'contentPMakeUp' + videoObjId} style={{ width: 0, display: 'inline-block' }}></div>
         </div>
      </div>
   )
}

export default React.memo(TextScroll)
