type TLog = Record<string, unknown>|string;

function error(data: TLog|Error) {
    let metadata: TLog = data as TLog;
    if(data instanceof Error) {
        metadata = { 
            message: data.message, 
            name: data.name, 
            cause: data.cause, 
            stack: data.stack 
        };
    }
    log("error", metadata);
}

function info(data: TLog) {
    log("info", data);
}

function warn(data: TLog) {
    log("warning", data);
}

function log(level: "error"|"warning"|"info", data?: TLog) {
    // if data is string then just turn it into an object
    if(typeof(data) === "string") {
        data = { message: data }
    }

    console.log(JSON.stringify({
        level,
        loggerService: process.env.APP_NAME! ?? "Unknown",
        ...data
    }));
}

export default {
    error,
    info,
    warn
}