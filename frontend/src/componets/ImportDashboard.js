import {useState} from "react"
import {useForm} from "react-hook-form"
import {Grid, FormControl, InputLabel, Input, Box, Button} from "@material-ui/core"
import Service from "../http"


export default function ImportDashboard() {
    const [isLoading, setLoading] = useState(false)
    const { register, handleSubmit, watch, formState: { errors } } = useForm();

    const getPrepareData = data => {
        return {
            fromDb: {
                host: data.hostFrom,
                port: data.dbPortFrom,
                database: data.dbNameFrom,
                user: data.usernameDbFrom,
                password: data.passDbFrom,
            },
            toDb: {
                host: data.hostTo,
                port: data.dbPortTo,
                database: data.dbNameTo,
                user: data.usernameDbTo,
                password: data.passDbTo,
            }
        }
    }

    const runImport = async (data) => {
        const prepareData = getPrepareData(data)
        setLoading(true)
        console.log(prepareData)
        const res = await Service("post", "/mysql/run-sync", prepareData)
        console.log(res)
        setLoading(false)
    }

    const checkConnection = async (data) => {
        const prepareData = getPrepareData(data)
        const res = await Service("post", "/mysql/run-sync", prepareData)
    }

    return (
        <Box sx={{ p: 5 }}>
            <form onSubmit={handleSubmit(runImport)}>
                <Box>
                   <h3>From:</h3>
                   <Grid>
                       <FormControl>
                           <InputLabel htmlFor="hostFrom">IP или URL адрес сервера</InputLabel>
                           <Input {...register("hostFrom")} defaultValue="localhost"/>
                       </FormControl>
                   </Grid>
                   <Grid>
                       <FormControl required={true}>
                           <InputLabel htmlFor="dbNameFrom">Имя базы данных</InputLabel>
                           <Input id="dbNameFrom" {...register("dbNameFrom")} defaultValue="news"/>
                       </FormControl>
                   </Grid>
                   <Grid>
                       <FormControl required={true}>
                           <InputLabel htmlFor="dbPortFrom">Порт соединения к БД</InputLabel>
                           <Input id="dbPortFrom" {...register("dbPortFrom")} defaultValue="3307"/>
                       </FormControl>
                   </Grid>
                   <Grid>
                       <FormControl required={true}>
                           <InputLabel htmlFor="loginDbFrom">Логин</InputLabel>
                           <Input id="loginFrom" {...register("usernameDbFrom")} defaultValue="user"/>
                       </FormControl>
                   </Grid>
                   <Grid>
                       <FormControl required={true}>
                           <InputLabel htmlFor="passDbFrom">Пароль</InputLabel>
                           <Input id="passDbFrom" {...register("passDbFrom")} type="password" defaultValue="password"/>
                       </FormControl>
                   </Grid>
                </Box>
                <br/>
                <Box>
                    <h3>To:</h3>
                    <Grid>
                        <FormControl>
                            <InputLabel htmlFor="hostTo">IP или URL адрес сервера</InputLabel>
                            <Input {...register("hostTo")} defaultValue="localhost"/>
                        </FormControl>
                    </Grid>
                    <Grid>
                        <FormControl required={true}>
                            <InputLabel htmlFor="dbNameTo">Имя базы данных</InputLabel>
                            <Input id="dbNameTo" {...register("dbNameTo")} defaultValue="news"/>
                        </FormControl>
                    </Grid>
                    <Grid>
                        <FormControl required={true}>
                            <InputLabel htmlFor="dbPortTo">Порт соединения к БД</InputLabel>
                            <Input id="dbPortTo" {...register("dbPortTo")} defaultValue="3306"/>
                        </FormControl>
                    </Grid>
                    <Grid>
                        <FormControl required={true}>
                            <InputLabel htmlFor="loginDbTo">Логин</InputLabel>
                            <Input id="loginFrom" {...register("usernameDbTo")} defaultValue="user"/>
                        </FormControl>
                    </Grid>
                    <Grid>
                        <FormControl required={true}>
                            <InputLabel htmlFor="passDbTo">Пароль</InputLabel>
                            <Input id="passDbTo" {...register("passDbTo")} type="password" defaultValue="password"/>
                        </FormControl>
                    </Grid>
                </Box>
                <br/>
                <Box sx={{ m: 1 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                    >Run import</Button>
                </Box>
                <Box sx={{ p: 1 }}>
                    <Button
                        onClick={handleSubmit(checkConnection)}
                        variant="contained"
                        sx={{m: "2"}}
                    >Check Connection</Button>
                </Box>
            </form>
        </Box>
    )
}