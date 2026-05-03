<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'user_id'        => $this->user_id,
            'user_name'      => $this->user_name,
            'spv_name'       => $this->spv_name,
            'report_date'    => $this->report_date,
            'shift'          => $this->shift,
            'description'    => $this->description,
            'manual_content' => $this->manual_content,
            'file_path'      => $this->file_path,
            'file_url'       => $this->file_url, // Accessor or attribute
            'form_data'      => $this->form_data,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
            
            // Example of using when() for conditional data
            'audit_info'     => $this->when($request->user()?->role === 'Admin', [
                'ip_address' => $request->ip(),
            ]),
        ];
    }
}
