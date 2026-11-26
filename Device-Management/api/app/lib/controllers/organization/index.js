'use strict';
const moment = require('moment')
const { Op } = require('sequelize')

async function allDeps(ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { redis } = ctx.app
      const start = moment()
      let depRes = await redis.get('allDepartments')
      if (depRes) {
         depRes = JSON.parse(depRes)
         depRes = depRes.departments
      }
      ctx.status = 200;
      ctx.body = depRes || []
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {

      }
   }
}

async function allUsers(ctx) {
   try {
      const { models } = ctx.fs.dc;
      const { clickHouse } = ctx.app.fs
      const { includeDel } = ctx.query

      const userRes = await clickHouse.pepEmis.query(`
         SELECT id, name, email, phone FROM user ${includeDel ? '' : `WHERE delete = '0'`}
      `).toPromise()

      ctx.status = 200;
      ctx.body = userRes
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: error`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function editUser(ctx) {
   //事务
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const models = ctx.fs.dc.models;
      const { pomsUserId, pepUserId, role = [], correlationProject = [], isPushProcessTicket, projectFollow = [] } = ctx.request.body
      const { pepUserId: optionAddPepUser } = ctx.fs.api
      const existUserRes = await models.User.findOne({
         where: {
            pepUserId
         }
      })
      const userId = existUserRes && existUserRes.dataValues.id
      //用户表中所有的关注项目
      const alreadyFollowProjects = await models.User.findAll({
         attributes: ['project_follow'],
         where: {
            project_follow: {
               [Op.not]: null
            },
            pepUserId: {
               [Op.ne]: pepUserId // 排除当前用户
            },
            deleted: {
               [Op.ne]: true // 排除已删除的用户
            }
         },
         raw: true
      });
      const allProjectFollows = alreadyFollowProjects
         .map(user => user.project_follow)
         .filter(Boolean)
         .flat();
      if (
         existUserRes && !existUserRes.deleted && !pomsUserId &&
         (
            (existUserRes.role.includes('admin') && role.includes('admin'))
            || (!existUserRes.role.includes('admin') && !role.includes('admin'))
            // 都有或都没有管理员
         )
      ) {
         // 新增已存在未删除
         throw '人员账号已添加'
      }

      let storageData = {
         pepUserId,
         role,
         correlationProject,
         isPushProcessTicket,
         projectFollow,
         updateTime: moment().format()
      }
      if (existUserRes) {
         // 存在且传递id 或者 不传id也存在
         // 修改 update
         if (
            role.includes('admin')
         ) {
            if (existUserRes.role.includes('admin')) {
               // 已是管理员
               throw '当前人员已是管理员'
            }
            // 正在修改为管理员
            storageData.disabled = true
            storageData.role = [...new Set([...existUserRes.role, ...role])]
         } else if (existUserRes.role.includes('admin')) {
            // 正在修改成员 但是此时还是管理员
            storageData.disabled = true
            storageData.deleted = false
            storageData.role = [...role, 'admin']
         } else {
            storageData.deleted = false
         }
         const oldFollowIds = Array.isArray(existUserRes.projectFollow) ? existUserRes.projectFollow : [];
         const newFollowIds = Array.isArray(projectFollow) ? projectFollow : [];

         // 需要新增关注的项目
         const addFollowIds = newFollowIds.filter(id => !oldFollowIds.includes(id));
         // 需要取消关注的项目
         const removeFollowIds = oldFollowIds.filter(id => !newFollowIds.includes(id));

         // 校验：新增关注的项目是否已被其他人关注
         const conflictProjects = addFollowIds.filter(id => allProjectFollows.includes(id));
         if (conflictProjects.length) {
            // 查询冲突项目的名称
            const conflictProjectsInfo = await models.ProjectCorrelation.findAll({
               attributes: ['id', 'name'],
               where: {
                  id: { [Op.in]: conflictProjects }
               },
               raw: true
            });

            const conflictProjectNames = conflictProjectsInfo.map(project => project.name).join('、');
            throw `以下项目已被其他成员关注：${conflictProjectNames}`;
         }
         // 新增关注
         if (isPushProcessTicket && addFollowIds.length) {
            await models.ProjectCorrelation.update(
               {
                  autoAssignedUserId: pepUserId,
                  isPushProcessTicket: true
               },
               {
                  where: {
                     id: { [Op.in]: addFollowIds }
                  },
                  transaction
               }
            );
         }

         // 取消关注
         if (removeFollowIds.length) {
            await models.ProjectCorrelation.update(
               {
                  autoAssignedUserId: null,
                  isPushProcessTicket: false
               },
               {
                  where: {
                     id: { [Op.in]: removeFollowIds }
                  },
                  transaction
               }
            );
         }
         // 更新用户表
         await models.User.update(storageData, {
            where: {
               id: userId
            },
            transaction
         })
         await transaction.commit()
      } else {
         // 新增用户 - 检查项目关注冲突
         const { projectFollow = [], isPushProcessTicket } = storageData

         // 校验：新增关注的项目是否已被其他人关注
         const conflictProjects = projectFollow.filter(id => allProjectFollows.includes(id));
         if (conflictProjects.length) {
            // 查询冲突项目的名称
            const conflictProjectsInfo = await models.ProjectCorrelation.findAll({
               attributes: ['id', 'name'],
               where: {
                  id: { [Op.in]: conflictProjects }
               },
               raw: true
            });

            const conflictProjectNames = conflictProjectsInfo.map(project => project.name).join('、');
            throw `以下项目已被其他成员关注：${conflictProjectNames}`;
         }

         // 新增用户
         const newUser = await models.User.create({
            ...storageData,
            optionAddPepUser: optionAddPepUser
         }, {
            transaction
         })

         //批量更新project_correlation表
         if (isPushProcessTicket && projectFollow.length) {
            await models.ProjectCorrelation.update(
               {
                  autoAssignedUserId: pepUserId,
                  isPushProcessTicket
               },
               {
                  where: {
                     id: {
                        [Op.in]: projectFollow
                     }
                  },
                  transaction
               }
            )
         }

         const newUserDefaultPermissions = [
            'DEVICE',
            'AXYFIRMWAREUPGRADE',
            'ZWYFIRMWAREUPGRADE',
         ]
         const inertData = newUserDefaultPermissions.map(item => ({ userId: newUser.id, resourceId: item }))
         await models.UserResource.bulkCreate(inertData, { transaction })
         //默认添加权限
         await transaction.commit()
      }

      ctx.status = 204
   } catch (error) {
      await transaction.rollback()
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function putUser(ctx) {
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const models = ctx.fs.dc.models;
      const { pomsUserId } = ctx.params
      const { disabled = undefined, deleted = undefined } = ctx.request.body
      const existUserRes = await models.User.findOne({
         where: {
            id: pomsUserId
         }
      })

      if (existUserRes && existUserRes.role.includes('admin') && disabled == false) {
         throw '成员不能既是管理员又是普通成员'
      }

      const updateData = {
         disabled,
         deleted,
      }
      for (let k in updateData) {
         if (updateData[k] == undefined) {
            delete updateData[k]
         }
      }

      // 如果用户被删除，需要清理项目关注
      if (deleted === true && existUserRes) {
         const userProjectFollows = existUserRes.projectFollow || [];

         // 将用户关注的项目的autoAssignedUserId设置为null
         if (userProjectFollows.length > 0) {
            await models.ProjectCorrelation.update(
               {
                  autoAssignedUserId: null,
                  isPushProcessTicket: false
               },
               {
                  where: {
                     id: { [Op.in]: userProjectFollows }
                  },
                  transaction
               }
            );
         }

         // 清理User表中的项目关注字段
         updateData.projectFollow = [];
         updateData.isPushProcessTicket = false;
      }

      await models.User.update(updateData, {
         where: {
            id: pomsUserId
         },
         transaction
      })

      await transaction.commit();
      ctx.status = 204
   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function delAdmin(ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { pomsUserId } = ctx.params

      const existUserRes = await models.User.findOne({
         where: {
            id: pomsUserId
         }
      })
      if (existUserRes) {
         let updateValues = existUserRes.dataValues
         let adminIndex = updateValues.role.findIndex(r => r == 'admin')
         if (adminIndex > -1) {
            updateValues.role.splice(adminIndex, 1)
            if (updateValues.role.length < 1) {
               updateValues.deleted = true
            }
         }
         await models.User.update(updateValues, {
            where: {
               id: pomsUserId
            }
         })
      }

      ctx.status = 204;
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         message: typeof error == 'string' ? error : undefined
      }
   }
}

async function user(ctx) {
   try {
      const models = ctx.fs.dc.models;
      const { clickHouse } = ctx.app.fs
      const sequelize = ctx.fs.dc.orm;

      const { role, limit, page, keywords } = ctx.query

      const excludeField = ['lastInTime', 'inTimes', 'onlineDuration', 'lastInAddress', 'deleted', 'updateTime']

      let findOption = {
         attributes: {
            exclude: excludeField,
            // include: [[sequelize.fn('array_length', sequelize.col('role')), 'roleCount']]
         },
         where: {
            deleted: false,
            $or: [{
               $not: {
                  role: { $contained: ['SuperAdmin', 'admin'] }
               }
            },
            sequelize.where(sequelize.fn('cardinality', sequelize.col('role')), 0)],
            // $not: {
            //    role: { $contained: ['SuperAdmin', 'admin'] }
            // }
         },
         order: [['updateTime', 'DESC']]
      }
      if (role) {
         findOption.where.role = { $contains: [role] }
      }
      if (limit) {
         findOption.limit = limit
      }
      if (page && limit) {
         findOption.offset = page * limit

      }
      if (keywords) {
         let userPepRes = await clickHouse.pepEmis.query(`
            SELECT DISTINCT 
               user.id AS id, "user"."name" AS name, department.name AS depName, department.id AS depId 
            FROM department_user 
               LEFT JOIN user 
                  ON department_user.user=user.id 
               LEFT JOIN department 
                  ON department.id=department_user.department 
            WHERE 
               department.delete='0'
               AND "user"."name" LIKE '%${keywords}%'` || []
         ).toPromise() || []
         let userId = new Set()
         userPepRes.forEach(item => {
            userId.add(item.id)
         })
         findOption.where.pepUserId = Array.from(userId)

         /** 搞什么鸡毛 写这么多无用代码 */

         // let userRes = await models.User.findAndCountAll(findOption)
         // const adminRes = await models.User.findAll({
         //    where: {
         //       role: { $contains: ['admin'] }
         //    },
         //    attributes: {
         //       exclude: excludeField,
         //    },
         //    order: [['updateTime', 'DESC']]
         // })
         // let pomsProjectIds = new Set()
         // for (let u of userRes.rows.concat(adminRes)) {
         //    for (let pid of u.correlationProject) {
         //       pomsProjectIds.add(pid)
         //    }
         // }
         // // 获取响应的绑定的 项企项目的 id
         // let pomsProjectRes = await models.ProjectCorrelation.findAll({
         //    where: {
         //       id: { $in: [...pomsProjectIds] },
         //       // del: false
         //    }
         // })
         // let pepPojectIds = new Set()
         // for (let p of pomsProjectRes) {
         //    if (p.pepProjectId) {
         //       pepPojectIds.add(p.pepProjectId)
         //    }
         // }
         // // 查对应的项企项目信息
         // let pepProjectRes = pepPojectIds.size ?
         //    await clickHouse.projectManage.query(`
         //       SELECT id, project_name, isdelete FROM t_pim_project WHERE id IN (${[...pepPojectIds]},-1)
         //    `).toPromise() : []

         // for (let u of userRes.rows.concat(adminRes)) {
         //    // 用户信息
         //    const corUsers = userPepRes
         //    u.dataValues.name = corUsers.length ? corUsers[0].name : ''
         //    u.dataValues.departments = corUsers.length ? corUsers.map(cu => {
         //       return {
         //          name: cu.depName,
         //          id: cu.depId
         //       }
         //    }) : []
         //    // pep项目信息
         //    u.dataValues.correlationProject = u.dataValues.correlationProject.map(cpid => {
         //       let returnData = {
         //          id: cpid,
         //       }
         //       const corPomsProject = pomsProjectRes.find(ppr => ppr.id == cpid)
         //       if (corPomsProject) {
         //          returnData.name = corPomsProject.name
         //          returnData.del = corPomsProject.del
         //          if (corPomsProject.pepProjectId) {
         //             returnData.pepProjectId = corPomsProject.pepProjectId
         //             const corPepProject = pepProjectRes.find(ppr => ppr.id == corPomsProject.pepProjectId)
         //             if (corPepProject) {
         //                returnData.pepProjectName = corPepProject.project_name
         //                returnData.pepIsdelete = corPepProject.isdelete
         //             }
         //          }
         //       }
         //       return returnData
         //    })
         // }

         // ctx.status = 200
         // ctx.body = {
         //    admin: adminRes,
         //    users: userRes
         // }
      }

      let userRes = await models.User.findAndCountAll(findOption)
      const adminRes = await models.User.findAll({
         where: {
            role: { $contains: ['admin'] }
         },
         attributes: {
            exclude: excludeField,
         },
         order: [['updateTime', 'DESC']]
      })

      let userIds = new Set()
      let pomsProjectIds = new Set()
      for (let u of userRes.rows.concat(adminRes)) {
         userIds.add(u.pepUserId)
         if (u.optionAddPepUser) {
            userIds.add(u.optionAddPepUser)
         }
         for (let pid of u.correlationProject) {
            pomsProjectIds.add(pid)
         }
      }
      // 查用户所属的项企pep的部门、人员信息
      let userPepRes = userIds.size ?
         await clickHouse.pepEmis.query(`
            SELECT DISTINCT 
               user.id AS id, "user"."name" AS name, department.name AS depName, department.id AS depId 
            FROM department_user 
               LEFT JOIN user 
                  ON department_user.user=user.id 
               LEFT JOIN department 
                  ON department.id=department_user.department 
            WHERE 
                  user.id IN (${[...userIds].join(',')},-1) 
               AND department.delete='0'
               `
         ).toPromise() :
         []

      // 查用户绑定的当前系统的项目 id
      let pomsProjectRes = await models.ProjectCorrelation.findAll({
         where: {
            id: { $in: [...pomsProjectIds] },
            // del: false
         }
      })
      // 获取响应的绑定的 项企项目的 id
      let pepPojectIds = new Set()
      for (let p of pomsProjectRes) {
         if (p.pepProjectId) {
            pepPojectIds.add(p.pepProjectId)
         }
      }
      // 查对应的项企项目信息
      let pepProjectRes = pepPojectIds.size ?
         await clickHouse.projectManage.query(`
            SELECT id, project_name, isdelete FROM t_pim_project WHERE id IN (${[...pepPojectIds]},-1)
         `).toPromise() :
         []
      // 遍历用户并将查到的信息拼合
      for (let u of userRes.rows.concat(adminRes)) {
         // 用户信息
         const corUsers = userPepRes.filter(up => up.id == u.pepUserId)
         const optionAddPepUser = u.optionAddPepUser ? userPepRes.find(up => up.id == u.optionAddPepUser) : null
         u.dataValues.optionAddPepUser = optionAddPepUser ? optionAddPepUser.name : null
         u.dataValues.name = corUsers.length ? corUsers[0].name : ''
         u.dataValues.departments = corUsers.length ? corUsers.map(cu => {
            return {
               name: cu.depName,
               id: cu.depId
            }
         }) : []
         // pep项目信息
         u.dataValues.correlationProject = u.dataValues.correlationProject.map(cpid => {
            let returnData = {
               id: cpid,
            }
            const corPomsProject = pomsProjectRes.find(ppr => ppr.id == cpid)
            if (corPomsProject) {
               returnData.name = corPomsProject.name
               returnData.del = corPomsProject.del
               if (corPomsProject.pepProjectId) {
                  returnData.pepProjectId = corPomsProject.pepProjectId
                  const corPepProject = pepProjectRes.find(ppr => ppr.id == corPomsProject.pepProjectId)
                  if (corPepProject) {
                     returnData.pepProjectName = corPepProject.project_name
                     returnData.pepIsdelete = corPepProject.isdelete
                  }
               }
            }
            return returnData
         })
      }



      ctx.status = 200
      ctx.body = {
         admin: adminRes,
         users: userRes
      }
   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {

      }
   }
}

async function getResource(ctx, next) {
   try {
      const models = ctx.fs.dc.models;

      const res = await models.Resource.findAll({
         where: { parentResource: null },
         include: [{
            model: models.Resource,
         }]
      })

      ctx.body = res;
      ctx.status = 200;

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         "message": "查询所有权限数据失败"
      }
   }
}
async function getUserResource(ctx, next) {
   try {
      const models = ctx.fs.dc.models;
      const { userId } = ctx.query;

      const res = await models.UserResource.findAll({
         where: { userId: userId },
         include: [{
            model: models.Resource,
         }]
      })

      ctx.body = res;
      ctx.status = 200;

   } catch (error) {
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         "message": "查询用户权限数据失败"
      }
   }
}

async function updateUserRes(ctx, next) {
   const transaction = await ctx.fs.dc.orm.transaction();
   try {
      const models = ctx.fs.dc.models;
      const { userId, resCode } = ctx.request.body;

      const res = await models.UserResource.findAll({
         attributes: ["resourceId"],
         raw: true,
         where: { userId: userId }
      })

      const addRes = resCode.filter(r => !res.some(rr => rr.resourceId == r)).map(r => { return { userId: userId, resourceId: r } });
      const delRes = res.filter(r => !resCode.includes(r.resourceId)).map(r => r.resourceId);
      addRes.length && await models.UserResource.bulkCreate(addRes, { transaction: transaction });
      delRes.length && await models.UserResource.destroy({
         where: {
            resourceId: { $in: delRes },
            userId: userId
         },
         transaction: transaction
      })

      ctx.status = 204;
      await transaction.commit();

   } catch (error) {
      await transaction.rollback();
      ctx.fs.logger.error(`path: ${ctx.path}, error: ${error}`);
      ctx.status = 400;
      ctx.body = {
         "message": "更新用户权限数据失败"
      }
   }
}
module.exports = {
   allDeps,
   editUser,
   putUser,
   delAdmin,
   user,
   allUsers,
   getResource,
   getUserResource,
   updateUserRes
};
