
export const registerUser = (userData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!userData.email || !userData.password) {
        reject({ message: "Email and password are required!" });
      } else {
        console.log("Mock Backend received:", userData);
        resolve({ 
          status: "success", 
          message: "Workspace created!", 
          token: "dummy-jwt-token-xyz" 
        });
      }
    }, 1500);
  });
};