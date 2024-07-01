--- @endpoint
--- @name getTasks
--- @summary Retrieve a list of all tasks.
--- @description Get detailed information about all tasks available in the system.
--- @tags Tasks
--- @param data table The data received from the client specifying user preferences.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing all tasks available.
RegisterNuiCallback('getTasks', function(data, cb)
    cb(availableTasks(data.preferences))
end)

--- @endpoint
--- @name saveTask
--- @summary Save a task to the system.
--- @description Save a task to the system for future reference.
--- @tags Tasks
--- @param data table The data received from the client specifying task details.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing the result of the operation.
--- @response 200 The task was saved successfully.
--- @response 400 The task was not saved successfully.
RegisterNUICallback('saveTask', function(data, cb)
    if not next(Tasks[data.task]) then
        cb({
            success = false,
            message = 'Task not saved due to invalid data.'
        })
    else
        local inserted = ServerCallbackSync("task_management:tasks:saveTask", {
            taskId = data.taskId,
            task = Tasks[data.task]
        })

        cb({
            success = inserted.success,
            message = inserted.message
        })
    end
end)

--- @endpoint
--- @name removeTask
--- @summary Remove a task from the system.
--- @description Remove a specific task from the system.
--- @tags Tasks
--- @param data table The data containing the task to remove.
--- @param cb function The callback function to be called with the result.
--- @return table The result of the removal operation.
--- @response 200 The task was removed successfully.
--- @response 400 The task was not removed successfully.
RegisterNUICallback('removeTask', function(data, cb)
    local removed = ServerCallbackSync("task_management:tasks:removeTask", {
        taskId = data.taskId,
        task = data.task
    })

    cb({
        success = removed.success,
        message = removed.message
    })
end)


--- @endpoint
--- @name getTaskDetails
--- @summary Retrieve details of a specific task.
--- @description Get detailed information about a specific task.
--- @tags Tasks
--- @param data table The data containing the task ID to retrieve details for.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing task details.
RegisterNUICallback('getTaskDetails', function(data, cb)
    local taskDetails = GetTaskDetails(data.taskId)
    cb(taskDetails)
end)

--- @endpoint
--- @name getUserPreferences
--- @summary Retrieve user preferences.
--- @description Get user preferences for task management.
--- @tags Users, Preferences
--- @param data table The data received from the client.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing user preferences.
RegisterNUICallback('getUserPreferences', function(data, cb)
    local preferences = GetUserPreferences(data.userId)
    cb(preferences)
end)


--- @endpoint
--- @name updateUserPreferences
--- @summary Update user preferences.
--- @description Update user preferences for task management.
--- @tags Users, Preferences
--- @param data table The data containing the updated preferences.
--- @param cb function The callback function to be called with the result.
--- @return table The result of the update operation.
--- @response 200 The preferences were updated successfully.
--- @response 400 The preferences were not updated successfully.
RegisterNUICallback('updateUserPreferences', function(data, cb)
    local updated = ServerCallbackSync("user_management:preferences:update", {
        userId = data.userId,
        preferences = data.preferences
    })

    cb({
        success = updated.success,
        message = updated.message
    })
end)

--- @endpoint
--- @name getUserProfile
--- @summary Retrieve user profile information.
--- @description Get detailed information about the user profile.
--- @tags Users, Profile
--- @param data table The data received from the client.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing user profile information.
RegisterNUICallback('getUserProfile', function(data, cb)
    local profile = GetUserProfile(data.userId)
    cb(profile)
end)

--- @endpoint
--- @name updateUserProfile
--- @summary Update user profile information.
--- @description Update the information of the user profile.
--- @tags Users, Profile
--- @param data table The data containing the updated profile information.
--- @param cb function The callback function to be called with the result.
--- @return table The result of the update operation.
--- @response 200 The profile was updated successfully.
--- @response 400 The profile was not updated successfully.
RegisterNUICallback('updateUserProfile', function(data, cb)
    local updated = ServerCallbackSync("user_management:profile:update", {
        userId = data.userId,
        profile = data.profile
    })

    cb({
        success = updated.success,
        message = updated.message
    })
end)

--- @endpoint
--- @name getSystemStatus
--- @summary Retrieve system status information.
--- @description Get the current status of the system.
--- @tags System, Status
--- @param data table The data received from the client.
--- @param cb function The callback function to be called with the result.
--- @return table The table containing system status information.
RegisterNUICallback('getSystemStatus', function(data, cb)
    local status = GetSystemStatus()
    cb(status)
end)

--- @endpoint
--- @name restartSystem
--- @summary Restart the system.
--- @description Restart the entire system.
--- @tags System
--- @param data table The data received from the client.
--- @param cb function The callback function to be called with the result.
--- @return table The result of the restart operation.
--- @response 200 The system was restarted successfully.
--- @response 500 The system restart failed.
RegisterNUICallback('restartSystem', function(data, cb)
    local success, message = RestartSystem()
    cb({
        success = success,
        message = message
    })
end)
