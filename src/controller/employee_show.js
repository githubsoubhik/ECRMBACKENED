import Employee from "../models/employee.js";


export const getAllEmployee = async (req, res)=>{
try{

  const employee = await Employee.find();

  res.status(200).json({
    success:true,
    count: employee.length,
    data:employee
  });
} catch(error){
    console.error(error);
 
}


};

