class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something wents worng",
        errors = [],
        statck = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors 

        if (statck){
             this.stack = statck
        }else{
            Error.captureStackTrace(this, this.constructure)
        }
    }
}

export{ApiError}