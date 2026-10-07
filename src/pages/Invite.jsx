import { useState, useEffect } from 'react'
import { invitemem } from '../services/authApi'
import { useNavigate } from 'react-router-dom'

export default function Invite() {

    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        role: '',
    })
    const formHandler = async (e) => {
        e.preventDefault;
        const { name, value } = e.target;
        setFormData(prevformData => {
            return {
                ...prevformData,
                [name]: value
            }
        })
    }


    useEffect(() => {

    }, [formData])


 async function submitHandler(event) {
        event.preventDefault();
        try{
            await invitemem(formData);
        }
        catch(error){
             console.log(error);
        }
        console.log(formData);
    }

    return (
        <div className='w-full h-screen border border-4 flex items-center justify-center'>
            <button onClick={()=> {navigate("/dashboard")}}>
                Close
            </button>
            <form action="" className='flex justify-center items-center flex-col gap-2' onSubmit={submitHandler}>
                <input type="mail required"
                    placeholder='enter email'
                    name='email'
                    value={formData.value}
                    onChange={formHandler}
                    className='border rounded-lg'
                />
                <select name="role" id="role" value={formData.role} onChange={formHandler} required>
                    <option value="project manager">project manager</option>
                    <option value="developer">Developer</option>
                    <option value="tester">tester</option>
                    <option value="contributor">Contributor</option>
                    <option value="viewer">Viewer</option>
                </select>
                <button>
                    click me
                </button>
            </form>
        </div>
    )
}