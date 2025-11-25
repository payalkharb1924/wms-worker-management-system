import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col h-screen justify-center items-center gap-y-8">
      <h1 className="primary-font text-9xl font-extrabold font-sans">WMS</h1>
      <div className="flex justify-center items-center w-full max-w-xs gap-4 mt-4">
        <Link
          className=" primary-font text-2xl font-bold p-2 rounded-sm border"
          to="/signup"
        >
          Signup
        </Link>
        <Link
          className="primary-bg text-white text-2xl font-bold p-2 px-4 rounded-sm"
          to="/login"
        >
          Login
        </Link>
      </div>
    </div>
  );
};

export default Home;
