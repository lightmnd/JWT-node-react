import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import jwt_decode from "jwt-decode";

function App() {
  const [inputValue, setInputValue] = useState({ username: "", password: "" });
  const [error, setError] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [user, setUser] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [users, setUsers] = useState(null);

  /* ================= */

  /*
   check if token is valid and refresh it automatically
   verify expiration
   trigger refreshToken function
   update access token with new refreshed token
   keep alive the logged user after the token expiration
  */

  // create axios instance to avoid to the interceptors to verify user.accessToken without any logged user
  // that can be an error, so we can use
  const axiosJWT = axios.create();

  // with this method we ara able to check if the token is vali before any request
  axiosJWT.interceptors.request.use(
    async (config) => {
      const currentDate = new Date().getTime();
      const decodeToken = jwt_decode(user.accessToken);
      if (decodeToken.exp < currentDate) {
        const ref = refreshToken();
        config.headers["authorizazion"] = "Bearer " + ref.accessToken;
      }
      return config;
    },
    (err) => {
      return Promise.reject(err);
    }
  );

  /* ================= */

  const handleInput = (e) => {
    const value = e.target.value;
    setInputValue({ ...inputValue, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/login",
        inputValue
      );
      setUser(res.data);
      setSubmitted(true);
    } catch (error) {
      setError(true);
    }
  };

  const getUsers = async () => {
    const res = await axios.get("http://localhost:5000/api/users");
    setUsers(res.data);
  };

  useEffect(() => {
    getUsers();
  }, []);

  const handleDelete = async (data) => {
    try {
      await axiosJWT.delete("http://localhost:5000/api/users/" + user.id, {
        headers: { authorization: "Bearer " + data.accessToken },
      });
      setDeleted(true);
    } catch (error) {
      setError(true);
    }
  };

  const refreshToken = async () => {
    try {
      const res = await axiosJWT.post("http://localhost:5000/api/refresh", {
        token: user.refreshToken,
      });
      setUser({
        ...user,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      return res.data;
    } catch (error) {
      setError(true);
    }
  };

  return (
    <div className="App">
      <div className="container">
        {user?.username !== undefined && (
          <>
            <div className="userInfoContainer">
              <span>
                Welcome {user.username}!
                {user?.userRoles?.includes("admin") ? " | admin" : ""}
              </span>
            </div>
            <div>
              {users?.map((item) => {
                return (
                  <div key={item + Math.random(0, 10)}>
                    <span>{item.username}</span>
                    <button onClick={() => handleDelete(item)}>
                      Delete User
                    </button>
                  </div>
                );
              })}
            </div>
            {/* <p>{deleted ? "deleted" : "not authorized"}</p> */}
          </>
        )}

        {!submitted && (
          <form onSubmit={(e) => handleSubmit(e)}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              name="username"
              onChange={(e) => handleInput(e)}
            />
            <label htmlFor="password">Password</label>
            <input
              type="text"
              name="password"
              onChange={(e) => handleInput(e)}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;
