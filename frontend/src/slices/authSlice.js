import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  //check if userifo present in local storage use it else null
  userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // set userinfo and token in local storage
    setCredentials: (state, action) => {
      state.userInfo = action.payload;
      localStorage.setItem('userInfo', JSON.stringify(action.payload));
      if (action.payload && action.payload.token) {
        localStorage.setItem('token', action.payload.token);
      }
    },
    // clear local storage
    logout: (state, action) => {
      state.userInfo = null;
      localStorage.removeItem('userInfo');
      localStorage.removeItem('token');
    },
  },
});

// export actions
export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
