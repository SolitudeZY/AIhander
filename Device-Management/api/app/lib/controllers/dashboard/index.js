const moment = require('moment');

async function getProjects(ctx, next) {
   let rslt = [];
   let error = { name: 'FindError', message: '项目列表获取失败' };
   try {
      let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
      if (correlationProjectIds.length) {
         const { clickHouse } = ctx.app.fs;
         const { database: peppm } = clickHouse.projectManage.opts.config;
         let rows = await clickHouse.poms.query(`
            select ppc.id, ppc.pep_project_id, ppc.name, ptpp.project_name
            from project_correlation as ppc
            left join ${peppm}.t_pim_project as ptpp on ppc.pep_project_id=ptpp.id
            where ppc.id in (${correlationProjectIds.join(', ')}) and ppc.del=false and ptpp.isdelete=false
         `).toPromise();
         rslt = rows.map(r => ({
            correlationProjectId: r.id,
            projectName: r.project_name || r.name
         }));
      }
      error = null;
   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
}

function statWorkOrdersCount(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let allOrders = [];
      let resolvedOrders = [];
      let unresolvedOrders = [];
      let todoOrders = [];
      let overtimeOrders = [];
      let error = { name: 'FindError', message: '工单数统计失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataAnalysis, dataCenter } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select proc_inst_id, form_data, state, proc_name from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state != 'EXTERNALLY_TERMINATED' and state is not null
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();
         if (procinst_rows.length) {
            let procInstIds = procinst_rows.map(r => r.proc_inst_id);
            queryStr = `
               select procinst_id from work_orders_resolved_records 
               where procinst_id in (${procInstIds.map(id => `'${id}'`).join(', ')}) and resolved = 1
            `
            const resolvedRecords = await dataCenter.query(queryStr).toPromise();
            const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
            let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
            allOrders = procinst_rows.reduce((p, c) => {
               let formData = parseJsonString(c.form_data);
               if (correlationProjectIds.includes(formData.Linked_Project) || isAdmin) {
                  if (orderType && formData.Title.indexOf(orderType) != -1 || !orderType) {
                     p.push({
                        proc_inst_id: c.proc_inst_id,
                        state: c.state,
                        form_data: formData
                     });
                  }
               }
               return p;
            }, []);

            let completedOrders = allOrders.filter(p => p.state == 'COMPLETED');
            resolvedOrders = completedOrders.filter(p => p.form_data.Solution_Status == 'true' || resolvedRecords.some(r => r.procinst_id === p.proc_inst_id));
            unresolvedOrders = completedOrders.filter(p => p.form_data.Solution_Status == 'false' && !resolvedRecords.some(r => r.procinst_id === p.proc_inst_id));

            todoOrders = allOrders.filter(p => p.state == 'ACTIVE');

            overtimeOrders = completedOrders.reduce((p, c) => {
               let completionTime = c.form_data.Completion_Time;
               let planTime = c.form_data.pa3aGiey3N;
               if (moment(completionTime).isAfter(moment(planTime))) {
                  p.push(c);
               }
               return p;
            }, []);
         }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         let allOrdersCount = allOrders.length;
         let resolvedOrdersCount = resolvedOrders.length;
         let unresolvedOrdersCount = unresolvedOrders.length;
         let todoOrdersCount = todoOrders.length;
         ctx.status = 200;
         ctx.body = {
            allOrdersCount,
            resolvedOrdersCount,
            unresolvedOrdersCount,
            todoOrdersCount,
            invalidOrdersCount: allOrdersCount - resolvedOrdersCount - unresolvedOrdersCount - todoOrdersCount, // 作废工单数
            overtimeOrdersCount: overtimeOrders.length
         };
      }
   }
}

function statWorkOrdersCountByProject(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let rslt = null;
      let error = { name: 'FindError', message: '按项目统计工单数失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataAnalysis } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select form_data, state, proc_name, start_time from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state != 'EXTERNALLY_TERMINATED' and state is not null
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();

         let yearMonthCounts = {};
         const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
         let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
         let procinst_by_project = procinst_rows.reduce((p, c) => {
            let formData = parseJsonString(c.form_data);
            let projectId = formData.Linked_Project;
            if (correlationProjectIds.includes(projectId) || isAdmin) {
               let formDataTitle = formData.Title;
               if (orderType && formDataTitle.indexOf(orderType) != -1 || !orderType) {
                  let status = formData.Solution_Status;
                  let state = c.state;
                  let completionTime = formData.Completion_Time;
                  let planTime = formData.pa3aGiey3N;
                  let isDataInterrupt = formDataTitle.indexOf('数据中断') != -1;
                  let isDataException = formDataTitle.indexOf('数据异常') != -1;

                  let yearMonth = moment(c.start_time).add(8, 'hours').format('YYYY-MM');
                  if (!yearMonthCounts[yearMonth]) {
                     yearMonthCounts[yearMonth] = {
                        total: 0,
                        totalByDataInterrupt: 0,
                        totalByDataException: 0,
                        resolvedCount: 0,
                        resolvedCountByDataInterrupt: 0,
                        resolvedCountByDataException: 0,
                        unresolvedCount: 0,
                        unresolvedCountByDataInterrupt: 0,
                        unresolvedCountByDataException: 0,
                        todoCount: 0,
                        todoCountByDataInterrupt: 0,
                        todoCountByDataException: 0,
                        overtimeCount: 0,
                        overtimeCountByDataInterrupt: 0,
                        overtimeCountByDataException: 0
                     };
                  }
                  yearMonthCounts[yearMonth].total++;
                  if (isDataInterrupt) yearMonthCounts[yearMonth].totalByDataInterrupt++;
                  if (isDataException) yearMonthCounts[yearMonth].totalByDataException++;
                  if (state == 'COMPLETED') {
                     if (status == 'true') {
                        yearMonthCounts[yearMonth].resolvedCount++;
                        if (isDataInterrupt) yearMonthCounts[yearMonth].resolvedCountByDataInterrupt++;
                        if (isDataException) yearMonthCounts[yearMonth].resolvedCountByDataException++;
                     } else if (status == 'false') {
                        yearMonthCounts[yearMonth].unresolvedCount++;
                        if (isDataInterrupt) yearMonthCounts[yearMonth].unresolvedCountByDataInterrupt++;
                        if (isDataException) yearMonthCounts[yearMonth].unresolvedCountByDataException++;
                     }
                     if (moment(completionTime).isAfter(moment(planTime))) {
                        yearMonthCounts[yearMonth].overtimeCount++;
                        if (isDataInterrupt) yearMonthCounts[yearMonth].overtimeCountByDataInterrupt++;
                        if (isDataException) yearMonthCounts[yearMonth].overtimeCountByDataException++;
                     }
                  } else if (state == 'ACTIVE') {
                     yearMonthCounts[yearMonth].todoCount++;
                     if (isDataInterrupt) yearMonthCounts[yearMonth].todoCountByDataInterrupt++;
                     if (isDataException) yearMonthCounts[yearMonth].todoCountByDataException++;
                  }

                  if (p[projectId]) {
                     p[projectId].total++;
                     if (isDataInterrupt) p[projectId].totalByDataInterrupt++;
                     if (isDataException) p[projectId].totalByDataException++;
                     if (state == 'COMPLETED') {
                        if (status == 'true') {
                           p[projectId].resolvedCount++;
                           if (isDataInterrupt) p[projectId].resolvedCountByDataInterrupt++;
                           if (isDataException) p[projectId].resolvedCountByDataException++;
                        } else if (status == 'false') {
                           p[projectId].unresolvedCount++;
                           if (isDataInterrupt) p[projectId].unresolvedCountByDataInterrupt++;
                           if (isDataException) p[projectId].unresolvedCountByDataException++;
                        }
                        if (moment(completionTime).isAfter(moment(planTime))) {
                           p[projectId].overtimeCount++;
                           if (isDataInterrupt) p[projectId].overtimeCountByDataInterrupt++;
                           if (isDataException) p[projectId].overtimeCountByDataException++;
                        }
                     } else if (state == 'ACTIVE') {
                        p[projectId].todoCount++;
                        if (isDataInterrupt) p[projectId].todoCountByDataInterrupt++;
                        if (isDataException) p[projectId].todoCountByDataException++;
                     }
                  } else {
                     p[projectId] = {
                        total: 1,
                        totalByDataInterrupt: 0,
                        totalByDataException: 0,
                        resolvedCount: 0,
                        resolvedCountByDataInterrupt: 0,
                        resolvedCountByDataException: 0,
                        unresolvedCount: 0,
                        unresolvedCountByDataInterrupt: 0,
                        unresolvedCountByDataException: 0,
                        todoCount: 0,
                        todoCountByDataInterrupt: 0,
                        todoCountByDataException: 0,
                        overtimeCount: 0,
                        overtimeCountByDataInterrupt: 0,
                        overtimeCountByDataException: 0
                     };
                     p[projectId].totalByDataInterrupt = isDataInterrupt ? 1 : 0;
                     p[projectId].totalByDataException = isDataException ? 1 : 0;
                     if (state == 'COMPLETED') {
                        if (status == 'true') {
                           p[projectId].resolvedCount = 1;
                           p[projectId].resolvedCountByDataInterrupt = isDataInterrupt ? 1 : 0;
                           p[projectId].resolvedCountByDataException = isDataException ? 1 : 0;
                        } else if (status == 'false') {
                           p[projectId].unresolvedCount = 1;
                           p[projectId].unresolvedCountByDataInterrupt = isDataInterrupt ? 1 : 0;
                           p[projectId].unresolvedCountByDataException = isDataException ? 1 : 0;
                        }
                        if (moment(completionTime).isAfter(moment(planTime))) {
                           p[projectId].overtimeCount = 1;
                           p[projectId].overtimeCountByDataInterrupt = isDataInterrupt ? 1 : 0;
                           p[projectId].overtimeCountByDataException = isDataException ? 1 : 0;
                        }
                     } else if (state == 'ACTIVE') {
                        p[projectId].todoCount = 1;
                        p[projectId].todoCountByDataInterrupt = isDataInterrupt ? 1 : 0;
                        p[projectId].todoCountByDataException = isDataException ? 1 : 0;
                     }
                  }
               }
            }
            return p;
         }, {});

         // 确保结果中包含所有指定范围内的月份，即使没有数据
         const start_ = moment(startTime, 'YYYY-MM');
         const end_ = moment(endTime, 'YYYY-MM');
         let current = start_;
         while (current <= end_) {
            const yearMonth = current.format('YYYY-MM');
            if (!yearMonthCounts[yearMonth]) {
               yearMonthCounts[yearMonth] = {
                  total: 0,
                  totalByDataInterrupt: 0,
                  totalByDataException: 0,
                  resolvedCount: 0,
                  resolvedCountByDataInterrupt: 0,
                  resolvedCountByDataException: 0,
                  unresolvedCount: 0,
                  unresolvedCountByDataInterrupt: 0,
                  unresolvedCountByDataException: 0,
                  todoCount: 0,
                  todoCountByDataInterrupt: 0,
                  todoCountByDataException: 0,
                  overtimeCount: 0,
                  overtimeCountByDataInterrupt: 0,
                  overtimeCountByDataException: 0
               };
            }
            current.add(1, 'months');
         }
         const ordersCountByMonth = Object.keys(yearMonthCounts).map(key => ({
            yearMonth: key,
            ...yearMonthCounts[key]
         })).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

         let totalData = [], resolvedData = [], unresolvedData = [], todoData = [], overtimeData = [];
         for (let key in procinst_by_project) {
            let correlationProjectId = parseInt(key);
            let d = procinst_by_project[key];
            totalData.push({
               correlationProjectId,
               total: d.total,
               totalByDataInterrupt: d.totalByDataInterrupt,
               totalByDataException: d.totalByDataException
            });
            resolvedData.push({
               correlationProjectId,
               resolvedCount: d.resolvedCount,
               resolvedCountByDataInterrupt: d.resolvedCountByDataInterrupt,
               resolvedCountByDataException: d.resolvedCountByDataException
            });
            unresolvedData.push({
               correlationProjectId,
               unresolvedCount: d.unresolvedCount,
               unresolvedCountByDataInterrupt: d.unresolvedCountByDataInterrupt,
               unresolvedCountByDataException: d.unresolvedCountByDataException
            });
            todoData.push({
               correlationProjectId,
               todoCount: d.todoCount,
               todoCountByDataInterrupt: d.todoCountByDataInterrupt,
               todoCountByDataException: d.todoCountByDataException
            });
            overtimeData.push({
               correlationProjectId,
               overtimeCount: d.overtimeCount,
               overtimeCountByDataInterrupt: d.overtimeCountByDataInterrupt,
               overtimeCountByDataException: d.overtimeCountByDataException
            });
         }
         const sortedTotalData = totalData.sort((a, b) => b.total - a.total).slice(0, 10);
         const sortedResolvedData = resolvedData.sort((a, b) => b.resolvedCount - a.resolvedCount).slice(0, 10);
         const sortedUnresolvedData = unresolvedData.sort((a, b) => b.unresolvedCount - a.unresolvedCount).slice(0, 10);
         const sortedTodoData = todoData.sort((a, b) => b.todoCount - a.todoCount).slice(0, 10);
         const sortedOvertimeData = overtimeData.sort((a, b) => b.overtimeCount - a.overtimeCount).slice(0, 10);
         rslt = {
            totalOrders: sortedTotalData,
            resolvedOrders: sortedResolvedData,
            unresolvedOrders: sortedUnresolvedData,
            todoOrders: sortedTodoData,
            overtimeOrders: sortedOvertimeData,
            ordersCountByMonth
         }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         ctx.status = 200;
         ctx.body = rslt;
      }
   }
}

function statWorkOrdersElapseDeviationByProject(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let rslt = null;
      let error = { name: 'FindError', message: '按项目统计工单耗时偏差失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataAnalysis } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select form_data, proc_name, start_time from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state = 'COMPLETED'
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();
         const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
         let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
         let procinst_by_project = procinst_rows.reduce((p, c) => {
            let formData = parseJsonString(c.form_data);
            let projectId = formData.Linked_Project;
            if (correlationProjectIds.includes(projectId) || isAdmin) {
               if (orderType && formData.Title.indexOf(orderType) != -1 || !orderType) {
                  let completionTime = formData.Completion_Time;
                  let planTime = formData.pa3aGiey3N;
                  let expectTime = formData.Expected_Completion_Time;
                  let startTime = moment(c.start_time).add(8, 'hours').format('YYYY-MM-DD HH:mm:ss');
                  let planElapseInDay = moment(completionTime).diff(moment(planTime), 'days');
                  let expectElapseInDay = moment(completionTime).diff(moment(expectTime), 'days');
                  if (p[projectId]) {
                     p[projectId].push({ startTime, planElapseInDay, expectElapseInDay });
                  } else {
                     p[projectId] = [{ startTime, planElapseInDay, expectElapseInDay }];
                  }
               }
            }
            return p;
         }, {});
         if (projectNames && projectNames.length == 1) { // 单项目横轴展示发起时间，纵轴展示耗时偏差
            let data = Object.values(procinst_by_project);
            if (data.length) {
               let projectData = data[0];
               let plan = projectData.map(d => ({ startTime: d.startTime, elapseInDay: d.planElapseInDay }))
                  .sort((a, b) => b.elapseInDay - a.elapseInDay).slice(0, 10);
               let expect = projectData.map(d => ({ startTime: d.startTime, elapseInDay: d.expectElapseInDay }))
                  .sort((a, b) => b.elapseInDay - a.elapseInDay).slice(0, 10);
               rslt = { plan, expect };
            }
         } else {
            let data = Object.keys(procinst_by_project).map(key => {
               let planElapseInDaySum = 0;
               let expectElapseInDaySum = 0;
               let len = procinst_by_project[key].length;
               for (let d of procinst_by_project[key]) {
                  planElapseInDaySum += d.planElapseInDay;
                  expectElapseInDaySum += d.expectElapseInDay;
               }
               return {
                  correlationProjectId: parseInt(key),
                  planElapseInDay: parseFloat((planElapseInDaySum / len).toFixed(2)),
                  expectElapseInDay: parseFloat((expectElapseInDaySum / len).toFixed(2))
               };
            });

            let plan = data.map(d => ({
               correlationProjectId: d.correlationProjectId,
               elapseInDay: d.planElapseInDay
            })).sort((a, b) => b.elapseInDay - a.elapseInDay).slice(0, 10);

            let expect = data.map(d => ({
               correlationProjectId: d.correlationProjectId,
               elapseInDay: d.expectElapseInDay
            })).sort((a, b) => b.elapseInDay - a.elapseInDay).slice(0, 10);

            rslt = { plan, expect };
         }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         ctx.status = 200;
         ctx.body = rslt;
      }
   }
}

function getWorkOrdersUnresolved(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let rslt = [];
      let error = { name: 'FindError', message: '未解决工单获取失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataCenter, dataAnalysis, pepEmis } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select proc_inst_id, form_data, proc_name, apply_user_name, apply_department_name from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state = 'COMPLETED'
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();
         if (procinst_rows.length) {
            let procInstIds = procinst_rows.map(r => r.proc_inst_id);
            queryStr = `
               select procinst_id from work_orders_resolved_records 
               where procinst_id in (${procInstIds.map(id => `'${id}'`).join(', ')}) and resolved = 1
            `
            const resolvedRecords = await dataCenter.query(queryStr).toPromise();
            const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
            let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
            let data = procinst_rows.reduce((p, c) => {
               let formData = parseJsonString(c.form_data)
               let projectId = formData.Linked_Project;
               if (correlationProjectIds.includes(projectId) || isAdmin) {
                  if (orderType && formData.Title.indexOf(orderType) != -1 || !orderType) {
                     let pid = c.proc_inst_id;
                     if (formData.Solution_Status == 'false' && !resolvedRecords.some(r => r.procinst_id === pid)) {
                        let procNameX = c.proc_name.split('运维中台售后问题处理工单_');
                        p.push({
                           procInstId: pid,
                           projectName: procNameX.length == 2 ? procNameX[1] : '',
                           detail: formData.Detail,
                           processUserId: formData.Processing_Personnel,
                           planTime: formData.pa3aGiey3N,
                           procName: c.proc_name,
                           applyUserName: c.apply_user_name,
                           applyDepartmentName: c.apply_department_name
                        })
                     }
                  }
               }
               return p;
            }, []);
            if (data.length) {
               let userIds = data.map(d => d.processUserId);
               queryStr = `select id, name from "user" where id in (${userIds.join(', ')})`
               let users = await pepEmis.query(queryStr).toPromise();
               users_name = users.reduce((p, c) => {
                  p[c.id] = c.name;
                  return p;
               }, {});
               rslt = data.map(d => ({
                  procInstId: d.procInstId,
                  projectName: d.projectName,
                  detail: d.detail,
                  processUser: users_name[d.processUserId],
                  planTime: d.planTime,
                  procName: d.procName,
                  applyUserName: d.applyUserName,
                  applyDepartmentName: d.applyDepartmentName
               }));
            }
         }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         ctx.status = 200;
         ctx.body = rslt;
      }
   }
}

async function workOrdersResolved(ctx, next) {
   let error = { name: 'CreateError', message: '标记工单已解决失败' };
   try {
      const data = ctx.request.body;
      await ctx.app.fs.clickHouse.dataCenter.query(`
         insert into work_orders_resolved_records(procinst_id, resolved, create_at) values('${data.procInstId}', 1, now())
      `).toPromise();

      error = null;
   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 204;
   }
}

async function getWorkOrdersDetails(ctx, next) {
   let rslt = null;
   let error = { name: 'FindError', message: '工单详情获取失败' };
   try {
      const { procInstId } = ctx.params;
      const { pepEmis } = ctx.app.fs.clickHouse;
      let queryStr = `
         select wph.id, wph.process_number, wph.form_data, wph.version_id from workflow_process_history wph 
         where wph.procinst_id='${procInstId}'
      `
      let wph_rows = await pepEmis.query(queryStr).toPromise();

      if (wph_rows.length) {
         queryStr = `select wpv.form_id from workflow_process_version wpv where wpv.id=${wph_rows[0].version_id}`
         let rows = await pepEmis.query(queryStr).toPromise();

         if (rows.length) {
            queryStr = `select wpf.form_schema from workflow_process_form wpf where wpf.id=${rows[0].form_id}`
            let wpf_rows = await pepEmis.query(queryStr).toPromise();

            if (wpf_rows.length) {
               queryStr = `
                  select waj.id, u.name as operator, waj.action_name, waj.operate_content, waj.operate_at, waj.comment 
                  from workflow_action_journal waj 
                  inner join "user" u on waj.operator=u.id 
                  where operate_id='${procInstId}' and operate_at is not null 
                  order by operate_at asc
               `
               let waj_rows = await pepEmis.query(queryStr).toPromise();

               rslt = {
                  processNumber: wph_rows[0].process_number,
                  formSchema: wpf_rows[0].form_schema,
                  formData: wph_rows[0].form_data,
                  processDetails: waj_rows
               };
            }
         }
      }

      error = null;
   } catch (err) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
   }
   if (error) {
      ctx.status = 400;
      ctx.body = error;
   } else {
      ctx.status = 200;
      ctx.body = rslt;
   }
}

function getWorkOrdersOvertime(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let rslt = null;
      let error = { name: 'FindError', message: '超时工单获取失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataAnalysis } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select form_data, proc_name from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state = 'COMPLETED'
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();
         const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
         let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
         let data = procinst_rows.reduce((p, c) => {
            let formData = parseJsonString(c.form_data);
            let projectId = formData.Linked_Project;
            if (correlationProjectIds.includes(projectId) || isAdmin) {
               if (orderType && formData.Title.indexOf(orderType) != -1 || !orderType) {
                  let completionTime = formData.Completion_Time;
                  let planTime = formData.pa3aGiey3N;
                  if (moment(completionTime).isAfter(moment(planTime))) {
                     let procNameX = c.proc_name.split('运维中台售后问题处理工单_');
                     p.push({
                        projectName: procNameX.length == 2 ? procNameX[1] : '',
                        detail: formData.Detail,
                        planTime,
                        completionTime,
                        overtimeInDay: moment(completionTime).diff(moment(planTime), 'days')
                     })
                  }
               }
            }
            return p;
         }, []);
         rslt = data.sort((a, b) => b.overtimeInDay - a.overtimeInDay);
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         ctx.status = 200;
         ctx.body = rslt;
      }
   }
}

function statWorkOrdersElapseByProject(autoDispatchOrderUserId) {
   return async function (ctx, next) {
      let rslt = null;
      let error = { name: 'FindError', message: '按项目统计工单耗时失败' };
      const { parseJsonString } = ctx.app.fs.utils;
      try {
         const { startTime, endTime, orderType } = ctx.query;
         const { projectNames } = ctx.request.body;
         const { dataAnalysis } = ctx.app.fs.clickHouse;
         let start = moment(startTime).startOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let end = moment(endTime).endOf('day').subtract(8, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS');
         let queryStr = `
            select form_data, state, proc_name, start_time, end_time from poms_procinst_mv
            where start_user_id='fsUser${autoDispatchOrderUserId}' and state = 'COMPLETED'
            and start_time >= '${start}' and start_time <= '${end}'
         `
         if (projectNames && projectNames.length) {
            let projectNamesQuery = projectNames.map(projectName => `'运维中台售后问题处理工单_${projectName}'`).join(', ');
            queryStr = queryStr + ` and proc_name in (${projectNamesQuery})`
         }
         let procinst_rows = await dataAnalysis.query(queryStr).toPromise();

         const isAdmin = ctx.fs.api.userInfo.role.includes('SuperAdmin') || ctx.fs.api.userInfo.role.includes('admin');
         let correlationProjectIds = ctx.fs.api.userInfo.correlationProject || [];
         let procinst_by_project = procinst_rows.reduce((p, c) => {
            let formData = parseJsonString(c.form_data);
            let projectId = formData.Linked_Project;
            if (correlationProjectIds.includes(projectId) || isAdmin) {
               if (orderType && formData.Title.indexOf(orderType) != -1 || !orderType) {
                  if (formData.Solution_Status == 'true') {
                     let elapse = moment(c.end_time).diff(moment(c.start_time), 'days');
                     let sTime = moment(c.start_time).add(8, 'hours').format('YYYY-MM-DD HH:mm:ss');
                     if (p[projectId]) {
                        p[projectId].data.push({ startTime: sTime, elapse });
                     } else {
                        let procNameX = c.proc_name.split('运维中台售后问题处理工单_');
                        p[projectId] = { projectName: procNameX.length == 2 ? procNameX[1] : '', data: [{ startTime: sTime, elapse }] };
                     }
                  }
               }
            }
            return p;
         }, {});

         if (projectNames && projectNames.length == 1) { // 单项目横轴展示发起时间，纵轴展示工单耗时
            let data = Object.values(procinst_by_project);
            if (data.length) {
               let projectData = data[0].data;
               rslt = projectData.sort((a, b) => b.elapse - a.elapse).slice(0, 10);
            }
         } else {
            rslt = Object.keys(procinst_by_project).map(key => {
               let elapseTotal = 0;
               for (let d of procinst_by_project[key].data) {
                  elapseTotal += d.elapse;
               }
               return { correlationProjectId: parseInt(key), projectName: procinst_by_project[key].projectName, elapseTotal };
            }).sort((a, b) => b.elapseTotal - a.elapseTotal).slice(0, 10);
         }
         error = null;
      } catch (err) {
         ctx.fs.logger.error(`path: ${ctx.path}, error: ${err}`);
      }
      if (error) {
         ctx.status = 400;
         ctx.body = error;
      } else {
         ctx.status = 200;
         ctx.body = rslt;
      }
   }
}

module.exports = {
   getProjects,
   statWorkOrdersCount,
   statWorkOrdersCountByProject,
   statWorkOrdersElapseDeviationByProject,
   getWorkOrdersUnresolved,
   workOrdersResolved,
   getWorkOrdersDetails,
   getWorkOrdersOvertime,
   statWorkOrdersElapseByProject
};
