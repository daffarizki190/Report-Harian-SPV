<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->user()->role === 'Admin';
    }

    /**
     * Professional Data Sanitization: prepareForValidation()
     * Automatically format inputs before they reach the validation rules.
     */
    protected function prepareForValidation(): void
    {
        if ($this->username) {
            $this->merge([
                'username' => strtolower(trim($this->username)),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'     => 'required|string|max:255',
            'username' => 'required|string|unique:users,username' . ($this->id ? ',' . $this->id : ''),
            'role'     => 'required|in:Admin,Supervisor,CAR PARK MANAGER,Leader,Inhouse',
            'password' => $this->id ? 'nullable|string|min:6' : 'required|string|min:6',
        ];
    }
}
