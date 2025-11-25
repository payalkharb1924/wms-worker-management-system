import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const navigate = useNavigate();
  if (!isAuthenticated) {
    return navigate("/login");
  }
  return children;
};

export default ProtectedRoute;
