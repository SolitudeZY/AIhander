import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Skeleton, Button, Pagination, Form, Popconfirm, Table, message } from 'antd';
import { push } from 'react-router-redux';
import moment from "moment";

const Header = (props) => {
   const { dispatch, actions, user, match, weatherRealtime, history, groupDetail } = props
   const [queryUserId, setQueryUserId] = useState('')
   const [date, setDate] = useState(moment());
   const dayMap = { 0: '日', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' }
   const weatherMap = {
      CLEAR_DAY: '晴（白天）',
      CLEAR_NIGHT: '晴（夜间）',
      PARTLY_CLOUDY_DAY: '多云（白天）',
      PARTLY_CLOUDY_NIGHT: '多云（夜间）',
      CLOUDY: '阴',
      WIND: '大风',
      HAZE: '雾霾',
      RAIN: '雨',
      SNOW: '雪'
   }
   const [weatherTemperature, setWeatherTemperature] = useState('');
   const getWeather = () => {
      dispatch(actions.auth.getWeatherRealtime())
   }
   useEffect(() => {
      let search = props?.location?.search || '';
      let params = new URLSearchParams(search);
      let userId = params.get('pomsU')
      setQueryUserId(userId)

      const setTime = () => {
         setDate(moment());
         setTimeout(() => {
            setTime()
         }, 1000);
      }

      const refreshWeather = () => {
         getWeather();
         setTimeout(() => {
            refreshWeather()
         }, 1000 * 60 * 15);
      }

      setTimeout(() => {
         setTime()
         refreshWeather()
      }, 0);
   }, [])

   useEffect(() => {
      setWeatherTemperature(
         weatherRealtime?.temperature ?
            (weatherRealtime?.temperature - Math.ceil(Math.random() * 5))
            + '~' +
            (weatherRealtime?.temperature + Math.ceil(Math.random() * 3))
            + '℃'
            : ''
      )
   }, [weatherRealtime])

   const lineBetweenStyle = {
      width: 1,
      height: 15,
      border: '1px solid #B3C9FF',
      margin: '0 4px'
   }

   return (
      <div style={{
         backgroundImage: "url('/assets/images/projectGroup/header.png')",
         backgroundRepeat: "no-repeat",
         backgroundSize: "100% 100%",
         height: 64,
         lineHeight: '64px',
         padding: '0 24px',
         display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
         <span style={{ fontSize: 'xx-large', fontWeight: 'bolder' }}>
            {match?.path == '/projectGroup/bigscreen' ? `${groupDetail?.name}数据统计大屏` : '运维中台大屏'}
         </span>
         <span style={{
            display: 'flex', alignItems: 'center', flexDirection: 'row'
         }}>
            <div>
               <span style={{ fontSize: 'large', fontWeight: 'bolder' }}>
                  {date.format('HH:mm:ss')}
               </span>
            </div>
            <div style={lineBetweenStyle} />
            <div style={{
               display: 'flex', flexDirection: 'column',
               lineHeight: '12px',
               fontSize: 12,
               color: '#5A6685',
               letterSpacing: 0.6
            }}>
               <span style={{ lineHeight: '14px', }}>
                  星期{dayMap[date.day()]}
               </span>
               <span style={{ display: 'inline-block', minWidth: 74 }}>
                  {date.format('YYYY-MM-DD')}
               </span>
            </div>
            <div style={lineBetweenStyle} />
            <div style={{
               display: 'flex', flexDirection: 'column',
               lineHeight: '12px',
               fontSize: 12,
               color: '#5A6685',
               letterSpacing: 0.6
            }}>
               <span style={{ lineHeight: '14px', }}>
                  {weatherTemperature}
               </span>
               <span style={{}}>
                  {weatherMap[weatherRealtime?.skycon]}
               </span>
            </div>

            {match?.path == '/projectGroup/bigscreen' ? <>
               <div style={lineBetweenStyle} />
               <div style={{
                  display: "flex", alignItems: 'center', justifyContent: "space-around", width: 90,
                  color: 'color: #5A6685', fontSize: 14, fontFamily: "SourceHanSansCN-Regular", cursor: 'pointer'
               }} onClick={() => {
                  dispatch(push(`/projectGroup/statistic?pomsU=${queryUserId}`))
               }}>
                  <img src="/assets/images/projectGroup/backend.png" style={{ width: 14, height: 14 }} alt="" />
                  返回后台
               </div>
            </>
               : <></>
            }

         </span>
      </div>
   )
}
function mapStateToProps (state) {
   const { auth, global, weatherRealtime } = state;
   return {
      user: auth.user,
      actions: global.actions,
      weatherRealtime: weatherRealtime.data || {}
   };
}

export default connect(mapStateToProps)(Header);
