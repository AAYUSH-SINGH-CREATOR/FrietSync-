import { Link } from "react-router-dom"
export default function Login(){

  return(
    <div>
         <p className="text-center text-4xl-red font-bold">hello, this is login page</p>
         <Link to="/signup">back to signup</Link>
    </div>
  )
}

