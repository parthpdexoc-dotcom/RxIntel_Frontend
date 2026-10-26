import React from "react";
import SearchIcon from "@mui/icons-material/Search";
import "./SearchInput.css";

type SearchInputProps = {
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className={`search-input-wrap${disabled ? " is-disabled" : ""}`}>
      <SearchIcon className="search-input-icon" aria-hidden />
      <input
        type="search"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};

export default SearchInput;
