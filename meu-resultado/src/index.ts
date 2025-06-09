import express, {Request, Response} from 'express'
import { readFile } from 'fs'
import multer from 'multer'

interface logs {
    date: string,
    action: "login" | "logout"
}

interface project {
    name: string,
    completed: boolean
}

interface team {
    name: string,
    leader: boolean,
    projects: project[]
}

interface user {
    id: string,
    name: string,
    age: number,
    score: number,
    active: boolean,
    country: string,
    team: team
    logs: logs[]
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './src/archive')
    },
    filename: (req,file,cb) => {
        cb(null, 'usuarios.json')
    }
})
const upload = multer({ storage: storage })

const app = express()

let data:user[];

const loadUsers = () => {
    try {
        readFile('./src/archive/usuarios.json', 'utf-8', (err:any, fileData:any) => {
            if(err) return console.log(err)

            data = JSON.parse(fileData)
        })
    } catch(err) {
        console.log(err)
    }
}

loadUsers()

//Endpoint que recebe o json
app.post('/users', upload.single('file'), (req: Request, res: Response): any => {
  if (!req.file) return res.status(400).json({ mensagem: "Arquivo não encontrado."})
  
  return res.status(200).json({ message: "Arquivo recebido com sucesso"})
});

//Endpoint listando os usuarios com mais de 900 de score e ativo
app.get('/superusers', (req: Request, res:Response): any => {  
        if(!data) return res.status(500).json({ "error": "Nenhum arquivo foi encontrado."})

        const msBefore = performance.now()
        const users = data.filter((user:user) => user.score >= 900 && user.active == true) //listando por score e active
        const msAfter = performance.now()
        
        return res.status(200).json({
             timestamp: new Date().toISOString(),
             execution_time_ms: `${(msAfter - msBefore).toFixed(2)}ms`,
             data: users
            })
})

//Endpoint dos paises com maior quantidade de superusers
app.get('/top-countries', (req: Request, res:Response): any => {  
        if(!data) return res.status(500).json({ "error": "Nenhum arquivo foi encontrado."})

        const msBefore = performance.now()
        
        let countries:string[] = []
        data.map((user:user) => { //listando todos os paises sem repeticao no array countries
            if(!countries.includes(user.country)) countries.push(user.country)
        })

        const msAfter = performance.now()
        return res.status(200).json({
            timestamp: new Date().toISOString(),
             execution_time_ms: `${(msAfter - msBefore).toFixed(2)}ms`,
             countries: countries.map((country:string) => { //respondendo com os paises e superusers
                const superusers = data.filter((user:user) => user.country == country && user.score >= 900 && user.active).length //quantidade de superusers de cada país
                return {country, superusers} //devolvendo o país e superusers
             })
             .sort((a:any, b:any) => b.superusers - a.superusers) //organizando pela quantidade de superusers
             .slice(0, 5) //listando apenas 5
             })
})

//Endpoint que retorna estatisticas dos times
app.get('/team-insights', (req: Request, res:Response): any => {  
        if(!data) return res.status(500).json({ "error": "Nenhum arquivo foi encontrado."})
    
        const msBefore = performance.now()
        
        let teams:string[] = []
        data.map((user:user) => {
            if(!teams.includes(user.team.name)) teams.push(user.team.name)
        })
        

        const msAfter = performance.now()
        return res.status(200).json({
            timestamp: new Date().toISOString(),
             execution_time_ms: `${(msAfter - msBefore).toFixed(2)}ms`,
             teams: teams.map((team:string) => { 
                const total_members = data.filter((user:user) => user.team.name == team).length //total de membros do time
                const leader = data.filter((user:user) => user.team.name == team && user.team.leader).length //total de lideres do time
                const completed_projects = data.reduce((projectsLength:number, sum:user): number => { //filtrando e retornando todos projetos completados de cada usuario no time
                    if(sum.team.name == team) projectsLength += sum.team.projects.filter((project:project) => project.completed).length
                    return projectsLength
                }, 0)
                const active_percentage = ((data.filter((user:user) => user.team.name == team && user.active).length / total_members) * 100).toFixed(2) //porcentagem de membros ativos no time

                return {team, total_members, leader, completed_projects, active_percentage} //retorna tudo
             })
             })
})

//Endpoint que retorna logins por data
app.get('/active-users-per-day', (req: Request, res:Response): any => {  
        if(!data) return res.status(500).json({ "error": "Nenhum arquivo foi encontrado."})
        const msBefore = performance.now()

        //listando todas as datas onde aconteceu login
        let dates:any[] = []
            data.map((user:user) => {
            user.logs.map((log:logs) => {
                if(log.action == 'login' && !dates.includes(log.date)) return dates.push(log.date)
            })
        })

        const msAfter = performance.now()
        res.status(200).json({
            timestamp: new Date().toISOString(),
             execution_time_ms: `${(msAfter - msBefore).toFixed(2)}ms`,
             logins: dates.map((date:string) => {

                const total = data.reduce((acc:number, user:user): number => { //listando o total de login acontecido na data passada pelo map
                    acc += user.logs.filter((log:logs) => log.action == 'login' && log.date == date).length //filtando pela ação de login, e pela data passada pelo map
                    return acc //retornando quantidade de logins
                }, 0)

                return {date, total} //retornando os dados
             })
             })
             })

app.listen(8000, () => {
    console.log('Servidor aberto')
})